# System Architecture Documentation

## Overview

This document provides a comprehensive overview of the Gemini Live API integration architecture, focusing on the interaction between interruption handling, memory management, and real-time audio processing.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[User Interface]
        AC[Audio Capture]
        AP[Audio Playback]
        WS_CLIENT[WebSocket Client]
    end
    
    subgraph "Backend Layer"
        WS_SERVER[WebSocket Server]
        GC[Gemini Connection]
        VAD[Voice Activity Detection]
        MM[Memory Manager]
    end
    
    subgraph "External Services"
        GEMINI[Gemini Live API]
        MEM0[Mem0 Cloud]
    end
    
    UI --> AC
    AC --> WS_CLIENT
    WS_CLIENT <--> WS_SERVER
    WS_SERVER <--> GC
    GC <--> GEMINI
    GC --> VAD
    GC --> MM
    MM <--> MEM0
    GEMINI --> AP
    WS_SERVER --> AP
```

## Component Interactions

### Real-Time Audio Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Gemini
    participant Memory

    User->>Frontend: Speaks
    Frontend->>Backend: Audio Stream
    Backend->>Gemini: Audio Data
    Gemini->>Backend: Audio Response
    Backend->>Frontend: Audio Stream
    Frontend->>User: Plays Audio
    
    Note over User,Memory: Normal conversation flow
    
    Gemini->>Backend: Turn Complete
    Backend->>Memory: Save Complete Conversation
```

### Interruption Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Gemini
    participant Memory

    Note over User,Memory: AI is speaking
    
    User->>Frontend: Interrupts (speaks)
    Frontend->>Backend: Audio Stream
    Backend->>Gemini: Audio Data
    Gemini->>Backend: Interruption Detected
    Backend->>Backend: Set Interruption Flag
    Backend->>Frontend: Interruption Message
    Frontend->>Frontend: Stop Audio Playback
    
    Note over User,Memory: Conversation continues with new input
    
    Gemini->>Backend: Turn Complete
    Backend->>Backend: Check Interruption Flag
    alt Conversation Interrupted
        Backend->>Backend: Skip Memory Save
    else Conversation Complete
        Backend->>Memory: Save Conversation
    end
```

## Data Flow Architecture

### Memory Management Data Flow

```mermaid
flowchart TD
    A[User Input] --> B[AI Response Generation]
    B --> C{User Interrupts?}
    C -->|Yes| D[Set Interruption Flag]
    C -->|No| E[Complete Response]
    D --> F[Process New Input]
    E --> G[Turn Complete Event]
    F --> G
    G --> H{Check Interruption Flag}
    H -->|Interrupted| I[Skip Memory Save]
    H -->|Complete| J[Validate Data]
    I --> K[Reset Flag]
    J --> L{Data Valid?}
    L -->|Yes| M[Async Memory Save]
    L -->|No| N[Skip Save]
    M --> O[Log Result]
    N --> K
    O --> K
    K --> P[Ready for Next Conversation]
```

## Technical Implementation Details

### GeminiConnection Class Structure

```python
class GeminiConnection:
    def __init__(self):
        # Audio data accumulation
        self.accumulated_pcm_data = []
        self.accumulated_user_pcm_data = []
        
        # Transcription accumulation
        self.accumulated_input_transcription = []
        self.accumulated_output_transcription = []
        
        # Memory management
        self.is_conversation_interrupted = False  # Key flag
        self.memory_manager = None
        self.session_id = None
        
        # Connection management
        self.ws = None
        self.token_count = 0
```

### Key System States

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Listening : Start Conversation
    Listening --> Processing : User Speaks
    Processing --> Generating : Send to Gemini
    Generating --> Speaking : AI Responds
    Speaking --> Interrupted : User Interrupts
    Speaking --> Complete : Response Finished
    Interrupted --> Processing : New Input
    Complete --> Saving : Save to Memory
    Saving --> Idle : Memory Saved
    Interrupted --> Idle : Skip Memory Save
```

## Performance Characteristics

### Latency Measurements

| Operation | Target Latency | Typical Latency |
|-----------|---------------|-----------------|
| Interruption Detection | < 50ms | 20-30ms |
| Audio Stop Command | < 20ms | 10-15ms |
| Memory Save (Async) | Non-blocking | 200-500ms |
| VAD Response | < 45ms | 25-35ms |
| WebSocket Message | < 10ms | 5-8ms |

### System Throughput

- **Concurrent Sessions**: Up to 3 (Gemini Live API limit)
- **Audio Processing**: Real-time 24kHz PCM
- **Memory Operations**: Unlimited (async, non-blocking)
- **Message Rate**: 100+ messages/second per session

## Error Handling Strategy

### Error Isolation Layers

```mermaid
graph TD
    A[User Request] --> B[Input Validation]
    B --> C[WebSocket Layer]
    C --> D[Gemini API Layer]
    D --> E[Memory Layer]
    
    B --> F[Input Error Handler]
    C --> G[Connection Error Handler]
    D --> H[API Error Handler]
    E --> I[Memory Error Handler]
    
    F --> J[User Feedback]
    G --> K[Reconnection Logic]
    H --> L[Fallback Response]
    I --> M[Skip Memory Save]
    
    J --> A
    K --> C
    L --> A
    M --> A
```

### Error Recovery Mechanisms

1. **WebSocket Disconnection**: Automatic reconnection with exponential backoff
2. **Gemini API Errors**: Graceful degradation with user notification
3. **Memory Save Failures**: Log error, continue operation without blocking
4. **Audio Processing Errors**: Reset audio pipeline, maintain conversation state

## Scalability Considerations

### Horizontal Scaling

- **Stateless Design**: Each WebSocket connection is independent
- **Session Isolation**: Memory and state per session
- **Load Balancing**: WebSocket connections can be distributed
- **Resource Management**: Memory operations are async and non-blocking

### Vertical Scaling

- **Memory Usage**: Bounded by active session count
- **CPU Usage**: Optimized for real-time audio processing
- **Network Bandwidth**: Efficient binary audio streaming
- **Storage**: Persistent memory in external Mem0 service

## Security Architecture

### Data Protection

```mermaid
graph LR
    A[User Audio] --> B[TLS Encryption]
    B --> C[WebSocket Secure]
    C --> D[Backend Processing]
    D --> E[API Key Auth]
    E --> F[Gemini API]
    D --> G[Token Auth]
    G --> H[Mem0 Cloud]
```

### Security Measures

1. **Transport Security**: All communications over TLS/WSS
2. **API Authentication**: Secure API key management
3. **Session Isolation**: No cross-session data leakage
4. **Memory Privacy**: User-specific memory spaces
5. **Error Information**: No sensitive data in error messages

## Monitoring and Observability

### Key Metrics

- **Interruption Response Time**: Time from user speech to audio stop
- **Memory Save Success Rate**: Percentage of successful memory operations
- **WebSocket Connection Stability**: Connection uptime and reconnection frequency
- **Audio Quality Metrics**: Latency, dropouts, and synchronization
- **System Resource Usage**: CPU, memory, and network utilization

### Logging Strategy

```python
# Interruption Events
print(f"[{time.time()}] Generation interrupted by user activity")
print("Conversation marked as interrupted - will not be saved to memory")

# Memory Operations
print("Saving complete conversation - User: {user_text[:50]}...")
print("Complete conversation saved to memory with ID: {memory_id}")

# System Health
print("Turn complete detected - processing memory save")
print("Skipping memory save - conversation was interrupted")
```

## Configuration Management

### Environment Variables

```bash
# API Configuration
GEMINI_API_KEY=your_gemini_api_key
MEM0_API_KEY=your_mem0_api_key

# System Configuration
VAD_SILENCE_DURATION=45
VAD_SENSITIVITY=HIGH
MEMORY_SAVE_TIMEOUT=5000

# Connection Configuration
WEBSOCKET_TIMEOUT=30
RECONNECTION_ATTEMPTS=3
```

### Runtime Configuration

- **VAD Parameters**: Adjustable per deployment environment
- **Memory Thresholds**: Configurable minimum message lengths
- **Error Handling**: Configurable retry counts and timeouts
- **Logging Levels**: Environment-specific verbosity settings

## Deployment Architecture

### Production Deployment

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[NGINX/HAProxy]
    end
    
    subgraph "Application Tier"
        APP1[Backend Instance 1]
        APP2[Backend Instance 2]
        APP3[Backend Instance N]
    end
    
    subgraph "External Services"
        GEMINI[Gemini Live API]
        MEM0[Mem0 Cloud]
    end
    
    LB --> APP1
    LB --> APP2
    LB --> APP3
    
    APP1 --> GEMINI
    APP2 --> GEMINI
    APP3 --> GEMINI
    
    APP1 --> MEM0
    APP2 --> MEM0
    APP3 --> MEM0
```

### Deployment Considerations

1. **Session Affinity**: WebSocket connections require sticky sessions
2. **Health Checks**: Monitor WebSocket endpoint availability
3. **Resource Limits**: Configure appropriate CPU and memory limits
4. **Auto-scaling**: Scale based on active WebSocket connections
5. **Backup Strategy**: Memory data is stored in external Mem0 service
