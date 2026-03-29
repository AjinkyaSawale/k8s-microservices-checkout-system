# k8s-microservices-checkout-system

# k8s-microservices-checkout-system

A cloud-native microservices checkout system built on Kubernetes (K3s). This project demonstrates service communication, request ID tracing, and fault-tolerant design as part of an enterprise architecture assignment.

## Project Overview

This project simulates a small e-commerce checkout system using a microservices architecture. The aim is to move from a simple Docker-based setup to Kubernetes, while improving scalability, reliability, and observability.

## Current Architecture (Work in Progress)

- Gateway service (entry point)
- Checkout service (handles checkout logic)
- Pricing service (to be implemented)
- Inventory service (to be implemented)
- PostgreSQL with persistent storage (planned)
- Kubernetes Ingress using Traefik (planned)
- KEDA for scale-to-zero (planned)

## Implemented So Far

### Gateway Service
- Acts as the entry point for all requests
- Exposes:
  - GET /
  - GET /api/ping
  - GET /api/arch
  - POST /api/checkout
- Generates and forwards X-Request-Id for tracing

### Checkout Service
- Handles POST /checkout requests
- Calls pricing and inventory services
- Includes:
  - request ID propagation
  - timeout handling for dependencies
  - input validation
  - basic error handling and logging

## Request Flow (Planned)

Client → Gateway → Checkout → Pricing + Inventory → Database

Each request will carry a unique X-Request-Id which is passed across services for tracing.

## Key Features

- Microservices-based design
- HTTP communication between services
- Request correlation using headers
- Timeout-based failure handling
- Logging for debugging and diagnosis
- Kubernetes deployment (K3s)
- KEDA-based scaling (planned)
- Persistent storage using PostgreSQL (planned)

## Repository Structure

app/
  gateway/
  checkout/
  pricing/
  inventory/
k8s/
scripts/
docs/

## Status

Gateway and Checkout services are implemented and tested locally. Remaining services and Kubernetes deployment will be added next.

## Author

Ajinkya Sawale
