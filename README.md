# k8s-microservices-checkout-system

A cloud-native microservices-based checkout system built using Node.js and deployed on Kubernetes (K3s). This project demonstrates service communication, request tracing, scaling with KEDA, and handling partial failures in a distributed system.

---

## Overview

This project simulates an e-commerce checkout workflow composed of multiple services:

- Gateway (entry point)
- Checkout (business logic)
- Pricing (price lookup)
- Inventory (stock validation)

The system is deployed on Kubernetes and exposed via Ingress. It is designed to handle failures gracefully and scale dynamically based on traffic.

---

## Architecture

Request flow:

Client → Ingress → Gateway → Checkout → Pricing + Inventory

- Gateway handles all incoming traffic
- Checkout coordinates downstream services
- Services communicate internally using ClusterIP
- Ingress (Traefik) exposes the API externally

---

## Key Features

### Microservices Architecture

- Independent services for gateway, checkout, pricing, and inventory
- Clear separation of responsibilities
- HTTP-based communication between services

---

### Request Tracing

- Each request includes an `X-Request-Id`
- The ID is propagated across all services
- Logs can be used to trace a request end-to-end

---

### Scaling with KEDA

- Configured scale-to-zero for the gateway
- Automatically scales up when traffic arrives

Cold start latency:

This request triggered scale-from-zero using KEDA. The latency includes pod startup time.

![Cold Latency](docs/screenshots/13_cold_latency.png)

Warm request latency:

This request was handled by an already running pod, resulting in lower latency.

![Warm Latency](docs/screenshots/14_warm_latency.png)

---

### Failure Handling

- Downstream service failures are handled gracefully
- Checkout fails fast using timeouts
- Gateway remains available even if dependencies fail

Partial failure example:

This test simulates a downstream failure by scaling the inventory service to zero. The gateway remains available, while checkout fails quickly due to timeout handling.

![Partial Failure](docs/screenshots/12_partial_failure.png)

---

### Kubernetes Deployment

- Deployed using K3d (K3s)
- Each service has its own Deployment and Service
- ClusterIP used for internal communication
- Ingress used for external access

---

## Tech Stack

- Node.js (Express)
- Kubernetes (K3s / K3d)
- KEDA (event-driven scaling)
- Docker

---

## Project Structure

app/
- gateway/
- checkout/
- pricing/
- inventory/

k8s/
- Kubernetes manifests (deployments, services, ingress, scaling)

docs/
- screenshots

---

## What This Project Demonstrates

- Designing and deploying microservices on Kubernetes
- Implementing request tracing across services
- Handling partial failures in distributed systems
- Scaling applications dynamically using KEDA
- Observing system behavior using logs

---

## Future Improvements

- Add PostgreSQL for persistent storage
- Store checkout transactions or audit logs
- Improve observability with metrics and dashboards

---

## Author

Ajinkya Sawale