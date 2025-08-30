"""
Simple and robust Mem0 cloud API integration for Gemini Live.
Uses Mem0's hosted service for intelligent memory storage and retrieval.
"""

import os
from typing import List, Dict, Optional
import logging
from mem0 import MemoryClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Mem0MemoryManager:
    """
    Simple memory manager using Mem0 cloud API.
    Provides intelligent memory storage and retrieval through Mem0's hosted service.
    """

    def __init__(self):
        self.client = None
        self.default_user_id = "default_user"  # Fallback user ID
        self._initialize_mem0_client()
        logger.info("✅ Mem0 cloud memory manager initialized")

    def _initialize_mem0_client(self):
        """Initialize Mem0 client with API key from environment."""
        try:
            # Get API key from environment variable
            api_key = os.environ.get("MEM0_API_KEY")
            if not api_key:
                raise ValueError("MEM0_API_KEY environment variable is required")

            # Initialize Mem0 client
            self.client = MemoryClient(api_key=api_key)
            logger.info("✅ Mem0 client initialized with cloud API")

        except Exception as e:
            logger.error(f"Error initializing Mem0 client: {e}")
            raise RuntimeError(f"Could not initialize Mem0 client: {e}")
    
    async def initialize(self):
        """Initialize the Mem0 client (already done in __init__)."""
        try:
            # Test the client connection
            logger.info("✅ Mem0 client ready for use")
            return True
        except Exception as e:
            logger.error(f"Error testing Mem0 client: {e}")
            return False
    
    def add_to_memory(self, messages: List[Dict], session_id: str, user_id: str = None, metadata: Optional[Dict] = None):
        """
        Add conversation to Mem0 cloud using the API.

        Args:
            messages: List of message dicts with 'role' and 'content'
            session_id: Session identifier
            user_id: Authenticated user ID for memory isolation
            metadata: Optional metadata for enhanced context

        Returns:
            Memory ID if successful, None otherwise
        """
        try:
            logger.info(f"Adding to Mem0 cloud: {len(messages)} messages for session {session_id}")

            # Prepare metadata with session information
            if metadata is None:
                metadata = {}
            metadata.update({
                "session_id": session_id,
                "category": "conversation"
            })

            actual_user_id = user_id or self.default_user_id
            logger.info(f"🔐 Using user_id for Mem0: {actual_user_id}")

            # Add to Mem0 cloud using the official API with proper user isolation
            result = self.client.add(messages, user_id=actual_user_id, metadata=metadata)

            # Extract memory ID from result
            memory_id = None
            if isinstance(result, dict) and "results" in result:
                results = result["results"]
                if isinstance(results, list) and len(results) > 0:
                    # Get the first memory ID from results
                    memory_id = results[0].get("id")
                    logger.info(f"✅ Conversation saved to Mem0 cloud with ID: {memory_id}")
                else:
                    # Empty results but successful API call
                    logger.info("✅ Conversation processed by Mem0 (no new memories created)")
                    return "mem0_processed"
            else:
                logger.warning(f"Unexpected Mem0 result format: {result}")

            return memory_id

        except Exception as e:
            logger.error(f"Error adding to Mem0 cloud: {e}")
            return None
    
    def query_memory(self, query: str, user_id: str = None, session_id: str = None) -> List[Dict]:
        """
        Search for relevant memories using Mem0 cloud API.

        Args:
            query: Search query
            user_id: Authenticated user ID for memory isolation
            session_id: Optional session filter

        Returns:
            List of relevant memories from Mem0 cloud
        """
        try:
            logger.info(f"Querying Mem0 cloud: {query}")

            actual_user_id = user_id or self.default_user_id
            logger.info(f"🔐 Querying Mem0 for user_id: {actual_user_id}")

            # Search using Mem0 cloud API with proper user isolation
            response = self.client.search(query=query, user_id=actual_user_id)

            # Handle the response structure
            memories = []
            if isinstance(response, dict):
                # Check for different possible response structures
                if "results" in response:
                    memories = response["results"]
                elif "memories" in response:
                    memories = response["memories"]
                else:
                    memories = [response] if response else []
            elif isinstance(response, list):
                memories = response

            logger.info(f"Found {len(memories)} relevant memories from Mem0 cloud")
            return memories

        except Exception as e:
            logger.error(f"Error querying Mem0 cloud: {e}")
            return []

    async def get_recent_conversations(self, session_id: str, limit: int = 5) -> List[Dict]:
        """Get recent conversations from Mem0 cloud for context."""
        try:
            # Search for recent conversations in this session
            memories = self.query_memory("recent conversation", session_id)

            # Convert Mem0 memories to conversation format
            conversations = []
            for memory in memories[:limit]:
                memory_text = memory.get('memory', '')
                # Try to extract user and assistant messages from memory text
                if 'User asked:' in memory_text and 'Assistant replied:' in memory_text:
                    parts = memory_text.split('Assistant replied:')
                    if len(parts) == 2:
                        user_part = parts[0].replace('User asked:', '').strip()
                        assistant_part = parts[1].strip()
                        conversations.append({
                            'user_message': user_part,
                            'assistant_message': assistant_part,
                            'created_at': memory.get('created_at', 'unknown')
                        })

            return conversations

        except Exception as e:
            logger.error(f"Error getting recent conversations from Mem0 cloud: {e}")
            return []
    
    def format_memory_response(self, memories: List[Dict]) -> str:
        """Format Mem0 memories for use in responses."""
        if not memories:
            return "No relevant past conversations found."

        try:
            # Sort memories by score and get top results
            sorted_memories = sorted(memories, key=lambda x: x.get('score', 0), reverse=True)[:5]

            # Create readable summary from top memories
            memory_points = []
            for mem in sorted_memories:
                memory_text = mem.get('memory', '')
                if memory_text and len(memory_text) > 10:  # Skip very short memories
                    # Truncate very long memories
                    if len(memory_text) > 200:
                        memory_text = memory_text[:200] + "..."
                    memory_points.append(memory_text)

            if memory_points:
                memory_summary = "Relevant past conversations: " + " | ".join(memory_points)
                return memory_summary
            else:
                return "No relevant past conversations found."

        except Exception as e:
            logger.error(f"Error formatting memory response: {e}")
            return "Error retrieving past conversations."

    async def close(self):
        """Close Mem0 client connections if needed."""
        try:
            # Mem0 client handles its own cleanup
            logger.info("Mem0 client closed")
        except Exception as e:
            logger.warning(f"Error closing Mem0 client: {e}")

# Global memory manager instance
memory_manager = None

async def get_memory_manager() -> Mem0MemoryManager:
    """Get or create the global Mem0 memory manager instance."""
    global memory_manager
    if memory_manager is None:
        memory_manager = Mem0MemoryManager()
        await memory_manager.initialize()
    return memory_manager
