"""
Ultra-simple memory system for Gemini Live following the reference approach.
Uses only PostgreSQL for persistence - no complex dependencies.
"""

import os
import json
import asyncio
import asyncpg
from typing import List, Dict, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SimpleMemoryManager:
    """
    Ultra-simple memory manager following the reference implementation approach.
    Uses only PostgreSQL for persistence - no Mem0, no vector databases, no complex dependencies.
    """

    def __init__(self):
        self.db_pool = None
        self.user_id = "default_user"  # Simple fixed user ID like the reference
        logger.info("✅ Simple memory manager initialized (PostgreSQL only)")

    def _simple_text_search(self, query: str, conversations: List[Dict]) -> List[Dict]:
        """
        Simple text-based search through conversations.
        No embeddings, no vector search - just basic keyword matching.
        """
        query_words = query.lower().split()
        scored_conversations = []

        for conv in conversations:
            score = 0
            text_to_search = (conv.get('user_message', '') + ' ' + conv.get('assistant_message', '')).lower()

            # Simple scoring: count keyword matches
            for word in query_words:
                if word in text_to_search:
                    score += text_to_search.count(word)

            if score > 0:
                scored_conversations.append({
                    'conversation': conv,
                    'score': score
                })

        # Sort by score and return top results
        scored_conversations.sort(key=lambda x: x['score'], reverse=True)
        return [item['conversation'] for item in scored_conversations[:5]]
    
    async def initialize_db(self):
        """Initialize PostgreSQL database connection and tables."""
        try:
            # Database connection string - try to connect to local PostgreSQL
            db_url = os.environ.get("DATABASE_URL", "postgresql://localhost/gemini_memory")

            # Create connection pool
            self.db_pool = await asyncpg.create_pool(db_url, min_size=1, max_size=5)

            # Create tables if they don't exist
            async with self.db_pool.acquire() as conn:
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS conversations (
                        id SERIAL PRIMARY KEY,
                        session_id VARCHAR(255) NOT NULL,
                        user_message TEXT,
                        assistant_message TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                await conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_conversations_session_id
                    ON conversations(session_id)
                """)

                await conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_conversations_created_at
                    ON conversations(created_at)
                """)

            logger.info("✅ PostgreSQL database initialized")

        except Exception as e:
            logger.warning(f"PostgreSQL not available: {e}")
            logger.info("✅ Continuing with in-memory storage only")
            # Use simple in-memory storage as fallback
            self.conversations_memory = []
    
    def add_to_memory(self, messages: List[Dict], session_id: str, metadata: Optional[Dict] = None):
        """
        Add conversation to memory - ultra-simple approach.

        Args:
            messages: List of message dicts with 'role' and 'content'
            session_id: Session identifier
            metadata: Optional metadata (ignored in simple version)

        Returns:
            Simple ID if successful, None otherwise
        """
        try:
            logger.info(f"Adding to memory: {len(messages)} messages for session {session_id}")

            # Extract user and assistant messages
            user_msg = next((m['content'] for m in messages if m['role'] == 'user'), None)
            assistant_msg = next((m['content'] for m in messages if m['role'] == 'assistant'), None)

            if not user_msg or not assistant_msg:
                logger.warning("Incomplete conversation - missing user or assistant message")
                return None

            # Save to PostgreSQL or in-memory storage
            if self.db_pool:
                asyncio.create_task(self._save_to_db(user_msg, assistant_msg, session_id))
            else:
                # Fallback to in-memory storage
                if not hasattr(self, 'conversations_memory'):
                    self.conversations_memory = []

                self.conversations_memory.append({
                    'session_id': session_id,
                    'user_message': user_msg,
                    'assistant_message': assistant_msg,
                    'created_at': asyncio.get_event_loop().time()
                })

                # Keep only last 100 conversations in memory
                if len(self.conversations_memory) > 100:
                    self.conversations_memory = self.conversations_memory[-100:]

            logger.info("✅ Conversation saved to memory")
            return f"simple_id_{session_id}_{len(messages)}"

        except Exception as e:
            logger.error(f"Error adding to memory: {e}")
            return None
    
    async def _save_to_db(self, user_msg: str, assistant_msg: str, session_id: str):
        """Save conversation to PostgreSQL database."""
        try:
            if not self.db_pool:
                return

            async with self.db_pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO conversations (session_id, user_message, assistant_message)
                    VALUES ($1, $2, $3)
                """, session_id, user_msg, assistant_msg)

            logger.info(f"Saved conversation to PostgreSQL for session {session_id}")

        except Exception as e:
            logger.error(f"Error saving to database: {e}")
    
    def query_memory(self, query: str, session_id: str = None) -> List[Dict]:
        """
        Search for relevant memories based on the query - ultra-simple approach.

        Args:
            query: Search query
            session_id: Optional session filter

        Returns:
            List of relevant conversations formatted as memories
        """
        try:
            logger.info(f"Querying memory: {query}")

            # Get conversations from database or memory
            if self.db_pool:
                # This will be handled by async method
                conversations = []
                try:
                    # Create a simple sync wrapper for the async call
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        # If we're in an async context, we can't use run_until_complete
                        # So we'll use the in-memory fallback
                        conversations = getattr(self, 'conversations_memory', [])
                    else:
                        conversations = loop.run_until_complete(self._get_conversations_for_search(session_id))
                except:
                    conversations = getattr(self, 'conversations_memory', [])
            else:
                conversations = getattr(self, 'conversations_memory', [])

            # Simple text search
            relevant_conversations = self._simple_text_search(query, conversations)

            # Format as memory objects (similar to Mem0 format)
            formatted_memories = []
            for conv in relevant_conversations:
                memory_text = f"User asked: {conv['user_message']} Assistant replied: {conv['assistant_message']}"
                formatted_memories.append({
                    'memory': memory_text,
                    'score': 1.0,  # Simple scoring
                    'session_id': conv.get('session_id', 'unknown')
                })

            logger.info(f"Found {len(formatted_memories)} relevant memories")
            return formatted_memories

        except Exception as e:
            logger.error(f"Error querying memory: {e}")
            return []

    async def _get_conversations_for_search(self, session_id: str = None) -> List[Dict]:
        """Get conversations from database for search."""
        try:
            if not self.db_pool:
                return []

            async with self.db_pool.acquire() as conn:
                if session_id:
                    rows = await conn.fetch("""
                        SELECT session_id, user_message, assistant_message, created_at
                        FROM conversations
                        WHERE session_id = $1
                        ORDER BY created_at DESC
                        LIMIT 50
                    """, session_id)
                else:
                    rows = await conn.fetch("""
                        SELECT session_id, user_message, assistant_message, created_at
                        FROM conversations
                        ORDER BY created_at DESC
                        LIMIT 50
                    """)

                conversations = []
                for row in rows:
                    conversations.append({
                        'session_id': row['session_id'],
                        'user_message': row['user_message'],
                        'assistant_message': row['assistant_message'],
                        'created_at': row['created_at']
                    })

                return conversations

        except Exception as e:
            logger.error(f"Error getting conversations for search: {e}")
            return []

    async def get_recent_conversations(self, session_id: str, limit: int = 5) -> List[Dict]:
        """Get recent conversations from PostgreSQL or memory for context."""
        try:
            if self.db_pool:
                async with self.db_pool.acquire() as conn:
                    rows = await conn.fetch("""
                        SELECT user_message, assistant_message, created_at
                        FROM conversations
                        WHERE session_id = $1
                        ORDER BY created_at DESC
                        LIMIT $2
                    """, session_id, limit)

                    conversations = []
                    for row in rows:
                        conversations.append({
                            'user_message': row['user_message'],
                            'assistant_message': row['assistant_message'],
                            'created_at': row['created_at'].isoformat()
                        })

                    return conversations
            else:
                # Fallback to in-memory storage
                conversations = getattr(self, 'conversations_memory', [])
                session_conversations = [c for c in conversations if c['session_id'] == session_id]
                return session_conversations[-limit:] if session_conversations else []

        except Exception as e:
            logger.error(f"Error getting recent conversations: {e}")
            return []
    
    def format_memory_response(self, memories: List[Dict]) -> str:
        """Format memories for use in responses, following reference approach."""
        if not memories:
            return "No relevant past conversations found."

        try:
            # Sort memories by score and get top results (from reference)
            sorted_memories = sorted(memories, key=lambda x: x.get('score', 0), reverse=True)[:5]

            # Create readable summary from top memories (from reference)
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
        """Close database connections."""
        if self.db_pool:
            await self.db_pool.close()
            logger.info("Database connections closed")

# Global memory manager instance
memory_manager = None

async def get_memory_manager() -> SimpleMemoryManager:
    """Get or create the global memory manager instance."""
    global memory_manager
    if memory_manager is None:
        memory_manager = SimpleMemoryManager()
        await memory_manager.initialize_db()
    return memory_manager
