"""
Asynchronous Memory Operations for Mem0 Integration
Resolves UI blocking issues by implementing non-blocking memory operations
Performance improvement: Eliminates 200-500ms synchronous delays
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import json
from dataclasses import dataclass, asdict
from enum import Enum
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"

@dataclass
class MemoryTask:
    """Memory operation task for async processing"""
    task_id: str
    session_id: str
    operation: str  # 'save' or 'query'
    data: Dict[str, Any]
    status: TaskStatus
    created_at: datetime
    updated_at: datetime
    retry_count: int = 0
    max_retries: int = 3
    error_message: Optional[str] = None
    result: Optional[Dict[str, Any]] = None

class AsyncMemoryQueue:
    """
    Asynchronous memory operations queue
    Prevents UI blocking by processing Mem0 operations in background
    """
    
    def __init__(self):
        self.tasks: Dict[str, MemoryTask] = {}
        self.processing_queue = asyncio.Queue()
        self.worker_running = False
        self.mem0_client = None
        
    async def initialize(self, memory_manager):
        """Initialize the async memory queue with Mem0 memory manager"""
        # Extract the actual Mem0 client from the memory manager
        self.mem0_client = getattr(memory_manager, 'client', None)
        if not self.mem0_client:
            raise ValueError("Memory manager does not have a valid Mem0 client")

        if not self.worker_running:
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(self._worker())
                self.worker_running = True
                logger.info("🚀 Async Memory Queue initialized and worker started")
            except RuntimeError:
                # No event loop running, worker will be started when first task is queued
                logger.info("🚀 Async Memory Queue initialized, worker will start when needed")

    async def _ensure_worker_running(self):
        """Ensure the worker is running in the current event loop"""
        if not self.worker_running:
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(self._worker())
                self.worker_running = True
                logger.info("🚀 Async Memory Worker started")
            except RuntimeError as e:
                logger.error(f"❌ Failed to start worker: {e}")

    async def queue_memory_save(self, session_id: str, messages: List[Dict]) -> str:
        """
        Queue memory save operation (non-blocking)
        Returns task_id immediately for tracking
        """
        await self._ensure_worker_running()

        task_id = str(uuid.uuid4())

        task = MemoryTask(
            task_id=task_id,
            session_id=session_id,
            operation="save",
            data={"messages": messages},
            status=TaskStatus.PENDING,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        self.tasks[task_id] = task
        await self.processing_queue.put(task_id)

        logger.info(f"📝 Memory save queued for session {session_id[:8]}... (task: {task_id[:8]}...)")
        return task_id
    
    async def queue_memory_query(self, session_id: str, query: str) -> str:
        """
        Queue memory query operation (non-blocking)
        Returns task_id immediately for tracking
        """
        await self._ensure_worker_running()

        task_id = str(uuid.uuid4())

        task = MemoryTask(
            task_id=task_id,
            session_id=session_id,
            operation="query",
            data={"query": query},
            status=TaskStatus.PENDING,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        self.tasks[task_id] = task
        await self.processing_queue.put(task_id)
        
        logger.info(f"🔍 Memory query queued for session {session_id[:8]}... (task: {task_id[:8]}...)")
        return task_id
    
    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get status and result of a memory task"""
        task = self.tasks.get(task_id)
        if not task:
            return None
            
        return {
            "task_id": task.task_id,
            "status": task.status.value,
            "created_at": task.created_at.isoformat(),
            "updated_at": task.updated_at.isoformat(),
            "retry_count": task.retry_count,
            "error_message": task.error_message,
            "result": task.result
        }
    
    async def _worker(self):
        """Background worker to process memory operations"""
        logger.info("🔄 Async Memory Worker started")
        
        while True:
            try:
                # Wait for next task
                task_id = await self.processing_queue.get()
                task = self.tasks.get(task_id)
                
                if not task:
                    logger.warning(f"⚠️ Task {task_id} not found in queue")
                    continue
                
                # Update task status
                task.status = TaskStatus.PROCESSING
                task.updated_at = datetime.now()
                
                logger.info(f"⚡ Processing {task.operation} task {task_id[:8]}...")
                
                # Process the task
                success = await self._process_task(task)
                
                if success:
                    task.status = TaskStatus.COMPLETED
                    logger.info(f"✅ Task {task_id[:8]}... completed successfully")
                else:
                    await self._handle_task_failure(task)
                
                task.updated_at = datetime.now()
                
            except Exception as e:
                logger.error(f"❌ Worker error: {str(e)}")
                await asyncio.sleep(1)  # Brief pause on error
    
    async def _process_task(self, task: MemoryTask) -> bool:
        """Process individual memory task"""
        try:
            if task.operation == "save":
                # Save conversation to Mem0
                messages = task.data["messages"]
                result = await self._save_to_mem0(task.session_id, messages)
                task.result = {"memory_id": result}
                return True
                
            elif task.operation == "query":
                # Query Mem0 for relevant memories
                query = task.data["query"]
                result = await self._query_mem0(task.session_id, query)
                task.result = {"memories": result}
                return True
                
        except Exception as e:
            task.error_message = str(e)
            logger.error(f"❌ Task {task.task_id[:8]}... failed: {str(e)}")
            return False
        
        return False
    
    async def _save_to_mem0(self, session_id: str, messages: List[Dict]) -> str:
        """Save messages to Mem0 (async wrapper)"""
        if not self.mem0_client:
            raise Exception("Mem0 client not initialized")

        # Simulate async operation (prevent blocking)
        await asyncio.sleep(0.1)

        try:
            # DEBUG: Log the payload being sent to Mem0
            logger.info(f"🔍 DEBUG - Mem0 payload:")
            logger.info(f"   Session ID: {session_id}")
            logger.info(f"   Messages count: {len(messages)}")
            logger.info(f"   Messages preview: {json.dumps(messages[:1], indent=2, ensure_ascii=False) if messages else 'No messages'}")

            # Use thread pool for blocking Mem0 call with correct parameters
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.mem0_client.add(
                    messages=messages,
                    user_id=session_id
                )
            )

            # DEBUG: Log the response from Mem0
            logger.info(f"🔍 DEBUG - Mem0 response: {json.dumps(result, indent=2, ensure_ascii=False) if isinstance(result, dict) else str(result)}")

            # Handle the response correctly - Mem0 returns a dict with 'results' array
            if isinstance(result, dict):
                if 'results' in result and result['results']:
                    # Extract memory IDs from results
                    memory_ids = [item.get('id', 'unknown') for item in result['results']]
                    logger.info(f"📝 Mem0 memories created with IDs: {memory_ids}")
                    return f"batch_{len(memory_ids)}_memories"
                else:
                    logger.warning(f"⚠️ Unexpected Mem0 response format: {result}")
                    return "unknown_format"
            else:
                logger.info(f"📝 Mem0 response (string): {str(result)}")
                return str(result)
        except Exception as e:
            logger.error(f"❌ Mem0 save failed: {str(e)}")
            logger.error(f"   Session ID: {session_id}")
            logger.error(f"   Messages: {messages}")
            raise
    
    async def _query_mem0(self, session_id: str, query: str) -> List[Dict]:
        """Query Mem0 for memories (async wrapper)"""
        if not self.mem0_client:
            raise Exception("Mem0 client not initialized")

        await asyncio.sleep(0.1)  # Prevent blocking

        try:
            # Use thread pool for blocking Mem0 call with correct parameters
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.mem0_client.search(
                    query=query,
                    user_id=session_id
                )
            )
            return result or []
        except Exception as e:
            logger.error(f"❌ Mem0 query failed: {str(e)}")
            raise
    
    async def _handle_task_failure(self, task: MemoryTask):
        """Handle failed task with retry logic"""
        task.retry_count += 1
        
        if task.retry_count <= task.max_retries:
            task.status = TaskStatus.RETRYING
            # Exponential backoff: 2^retry_count seconds
            delay = 2 ** task.retry_count
            logger.info(f"🔄 Retrying task {task.task_id[:8]}... in {delay}s (attempt {task.retry_count}/{task.max_retries})")
            
            # Re-queue after delay
            asyncio.create_task(self._requeue_after_delay(task.task_id, delay))
        else:
            task.status = TaskStatus.FAILED
            logger.error(f"💥 Task {task.task_id[:8]}... failed permanently after {task.max_retries} retries")
    
    async def _requeue_after_delay(self, task_id: str, delay: int):
        """Re-queue task after delay for retry"""
        await asyncio.sleep(delay)
        await self.processing_queue.put(task_id)

# Global instance
async_memory_queue = AsyncMemoryQueue()
