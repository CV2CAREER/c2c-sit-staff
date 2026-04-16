Client Sample API Reference
This document provides the API request and response payload samples for the /admin/client-sample page. These can be used to implement the backend endpoints.

Base URL
All endpoints are relative to the API base (typically /api/v1).

1. Get Client Sample Users
Fetches a list of users available for selection in the "Run Sample" form.

Endpoint: GET /admin/client-sample/users
Response Sample:
json
{
  "success": true,
  "data": [
    {
      "Alias_Email": "user@example.com",
      "Full_Name": "John Doe",
      "uid": "user-123"
    },
    {
      "Alias_Email": "jane@example.com",
      "Full_Name": "Jane Smith",
      "uid": "user-456"
    }
  ]
}
2. Get Client Sample Table
Fetches the data for the Queued, Processing, or Completed tabs.

Endpoint:
For Queued/Processing: GET /admin/client-sample/table
For Completed: GET /admin/samples
Query Parameters:
variance: queue | processing | completed
environment: (optional) e.g., _TEST, _LIVE
jobsite: (optional) e.g., LinkedIn, ADECCO
Response Sample:
json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uid": "user-123",
      "name": "John Doe",
      "email": "user@example.com",
      "jobsiteEmail": "john.doe@jobsite.com",
      "aggregator": "LinkedIn",
      "bot": "Bot-01",
      "startTime": "2024-04-16T10:00:00Z",
      "endTime": null,
      "progress": 45,
      "status": "Running",
      "env": "_LIVE",
      "credentialId": 789
    }
  ]
}
3. Run Client Sample
Initiates a new sample run for a specific user on a jobsite.

Endpoint: POST /admin/client-sample/table
Request Payload:
json
{
  "environment": "_LIVE",
  "queue": "LinkedIn",
  "email": "user@example.com"
}
Response Sample:
json
{
  "success": true,
  "message": "Email user@example.com added to LinkedIn_LIVE queue"
}
4. Remove from Queue
Removes a pending sample request from the queue.

Endpoint: DELETE /admin/client-sample/table
Request Payload:
json
{
  "environment": "_LIVE",
  "email": "john.doe@jobsite.com",
  "queue": "LinkedIn"
}
Response Sample:
json
{
  "success": true,
  "message": "Removed from queue successfully"
}
5. Retry Client Sample
Retries a failed sample run.

Endpoint: POST /admin/client-sample/table
Request Payload:
json
{
  "queue": "LinkedIn",
  "email": "user@example.com"
}
Response Sample:
json
{
  "success": true,
  "message": "Retry initiated successfully"
}
6. Get Load Balancer (Perpetual Discovery Queue)
Fetches the current load balancer / perpetual discovery queue status.

Endpoint: GET /admin/client-sample/loadBalancer
Query Parameters:
jobsite: (optional) Filter by jobsite name.
Response Sample:
json
{
  "success": true,
  "data": [
    {
      "credentialId": 789,
      "uid": "user-123",
      "name": "John Doe",
      "aggregator": "LinkedIn",
      "email": "user@example.com",
      "jobsiteEmail": "john.doe@jobsite.com"
    }
  ]
}