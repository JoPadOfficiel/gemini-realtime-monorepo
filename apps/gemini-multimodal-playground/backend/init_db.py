#!/usr/bin/env python3
"""
Initialize PostgreSQL database for Gemini Live memory system.
Creates the database and tables needed for conversation persistence.
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def init_database():
    """Initialize the PostgreSQL database and tables."""
    print("🗄️ Initializing PostgreSQL database for Gemini Live memory...")
    
    # Database configuration
    db_host = os.environ.get("DB_HOST", "localhost")
    db_port = os.environ.get("DB_PORT", "5432")
    db_user = os.environ.get("DB_USER", "postgres")
    db_password = os.environ.get("DB_PASSWORD", "")
    db_name = "gemini_memory"
    
    try:
        # First, connect to the default postgres database to create our database
        print(f"📡 Connecting to PostgreSQL at {db_host}:{db_port}...")
        
        # Connection string for the default postgres database
        default_db_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/postgres"
        
        # Connect to default database
        conn = await asyncpg.connect(default_db_url)
        
        # Check if our database exists
        db_exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", db_name
        )
        
        if not db_exists:
            print(f"📦 Creating database '{db_name}'...")
            await conn.execute(f'CREATE DATABASE "{db_name}"')
            print(f"✅ Database '{db_name}' created successfully")
        else:
            print(f"✅ Database '{db_name}' already exists")
        
        await conn.close()
        
        # Now connect to our new database to create tables
        db_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
        print(f"📡 Connecting to database '{db_name}'...")
        
        conn = await asyncpg.connect(db_url)
        
        # Create conversations table
        print("📋 Creating conversations table...")
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(255) NOT NULL,
                user_message TEXT NOT NULL,
                assistant_message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Create user_settings table
        print("⚙️ Creating user_settings table...")
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_settings (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL UNIQUE,
                voice VARCHAR(50) DEFAULT 'Puck',
                language VARCHAR(10) DEFAULT 'auto',
                enable_proactive_audio BOOLEAN DEFAULT FALSE,
                enable_affective_dialog BOOLEAN DEFAULT FALSE,
                enable_vad BOOLEAN DEFAULT TRUE,
                enable_google_search BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes for better performance
        print("🔍 Creating indexes...")
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_conversations_session_id
            ON conversations(session_id)
        """)

        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_conversations_created_at
            ON conversations(created_at)
        """)

        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_settings_user_id
            ON user_settings(user_id)
        """)

        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at
            ON user_settings(updated_at)
        """)
        
        # Test the setup by inserting a sample conversation
        print("🧪 Testing database with sample data...")
        await conn.execute("""
            INSERT INTO conversations (session_id, user_message, assistant_message)
            VALUES ($1, $2, $3)
        """, "test_session", "Hello, this is a test message", "Hello! This is a test response from the assistant.")
        
        # Verify the data was inserted
        count = await conn.fetchval("SELECT COUNT(*) FROM conversations")
        print(f"✅ Database test successful - {count} conversation(s) in database")
        
        # Clean up test data
        await conn.execute("DELETE FROM conversations WHERE session_id = 'test_session'")
        
        await conn.close()
        
        print(f"\n🎉 Database initialization completed successfully!")
        print(f"📊 Database URL: postgresql://{db_user}:***@{db_host}:{db_port}/{db_name}")
        print(f"🔧 Set DATABASE_URL environment variable to:")
        print(f"   export DATABASE_URL=\"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}\"")
        
        return True
        
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        print("\n💡 Troubleshooting tips:")
        print("1. Make sure PostgreSQL is installed and running")
        print("2. Check your database credentials")
        print("3. Ensure the user has permission to create databases")
        print("4. Try: brew services start postgresql (on macOS)")
        print("5. Or: sudo systemctl start postgresql (on Linux)")
        return False

async def main():
    """Main function."""
    print("🚀 Gemini Live Memory Database Initialization")
    print("=" * 50)
    
    success = await init_database()
    
    if success:
        print("\n✅ Ready to use PostgreSQL with Gemini Live!")
        print("🧠 Conversations will now persist across server restarts")
    else:
        print("\n⚠️ Database initialization failed")
        print("🔄 The system will fall back to in-memory storage")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⚠️ Initialization interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
