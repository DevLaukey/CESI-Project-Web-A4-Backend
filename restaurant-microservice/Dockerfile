version: '3.8'

services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DB_HOST=${DB_HOST}
      - DB_PORT=${DB_PORT}
      - DB_USERNAME=${DB_USERNAME}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
      - DB_SSL_CA_PATH=/app/config/ca-certificate.pem
      - DB_SSL_REQUIRE=true
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./config:/app/config:ro
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    depends_on:
      - redis
    networks:
      - user-service-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - user-service-network

volumes:
  redis_data:

networks:
  user-service-network:
    driver: bridge