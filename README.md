# Large File Importer API

## Overview

This project implements a RESTful API that allows users to import **large CSV files (multiple GBs)** into a local **MongoDB** database.
The API is designed to handle large file imports efficiently by processing the CSV file in chunks and **leveraging Node.js worker threads for concurrency**. 
The application is built using **TypeScript** and **Express**, with **MongoDB** as the database.

## Architecture

- **Express Server**: Handles incoming HTTP requests and routes them to the appropriate services.
- **AppService**: Manages the queue of download jobs and worker threads.
- **Worker Threads**: Download and process the CSV file without blocking the main event loop.
- **MongoDB**: Stores the imported data and tracks the status of each import job.
- **StatusService**: Updates and retrieves the status of import jobs.

## Getting Started

### Prerequisites

- **Docker** and **Docker Compose** installed on your machine.

### Running the Application with Docker Compose

1. **Unzip the Code**
2. **Set Up Environment Variables**

   Create/modify a `.env` file in the root directory and add the following variables:

   ```dotenv
    BATCH_SIZE=10000
    PORT=3000
    PORT_EXTERNAL=3001
    DOWNLOAD_JOB_INTERVAL=1000
    DB_URL=mongodb://mongo:27017
    DB_NAME=vizzuality
    HTTP_LOG_FILE=http-access.log
    HTTP_LOG_FILE_INTERVAL=1d
    HTTP_LOG_FILE_DIRECTORY=logs
    CONCURRENT_DOWNLOADS=2
    DELETE_ON_ABORT=true
   ```

3. **Build and Start the Services**

   ```bash
   docker compose up --build
   ```

   This command will build the Docker images and start the following services:

   - **`vizzuality` API Service**: The main Express application.
   - **`mongo` MongoDB Service**: The MongoDB database.
   - **`external` External Server**: Serves CSV files for testing.

4. **Access the API**

   The API will be accessible at `http://localhost:3000`.

### Stopping the Application

To stop the application and remove the containers, run:

```bash
docker compose down
```

## Testing

### Running Automated Tests

The project includes unit tests using Jest. To run the tests:

1. **Install Dependencies**

   If you're running outside of Docker, install the dependencies:

   ```bash
   npm install
   ```

2. **Run Tests**

   ```bash
   npm test
   ```

### Manual Testing with `requests.http`

A `requests.http` file is provided for manual testing using tools like [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client). Take into account, that a `/csvs` folder with large CSV files for testing must be available in the root of the repository. The names of the files must be the same as the last path section of the `url` field of the body for the POST request (`large-file.csv` in the examples):

1. **Open `requests.http` in VSCode**
2. **Send Requests**

   - **Start Import Job**

     ```http
     POST http://localhost:3000/url
     Content-Type: application/json

     {
       "url": "http://external-server:3001/files/large-file.csv"
     }
     ```

   - **Check Status**

     ```http
     GET http://localhost:3000/url/{id}
     ```

   - **Cancel Import Job**

     ```http
     DELETE http://localhost:3000/url/{id}
     ```

## API Endpoints

### `POST /url`

Starts a new import job by providing a URL to a CSV file.

- **Request Body**

  ```json
  {
    "url": "http://external-server:3001/files/large-file.csv"
  }
  ```

- **Response**

  ```json
  {
    "id": "<some-random-uuid>",
    "url": "http://external-server:3001/files/large-file.csv",
    "position": 1
  }
  ```

### `GET /url/:id`

Retrieves the status of an import job.

- **Response**

  ```json
  {
    "id": "<some-random-uuid>",
    "status": "InProgress",
    "percentage": 50,
    "records": 100000,
    "duration": 60000,
    "eta": "2023-01-01T12:00:00.000Z"
  }
  ```

### `DELETE /url/:id`

Cancels a running import job.

- **Response**

  ```json
  {
    "id": "uuid",
    "status": "Aborted",
    "duration": 30000,
    "eta": "2023-01-01T12:00:00.000Z"
  }
  ```

## Configuration

The application can be configured using environment variables defined in the `.env` file.

- `PORT`: Port for the API server (default: `3000`).
- `PORT_EXTERNAL`: Port for the external server (default: `3001`).
- `DB_URL`: MongoDB connection string (default: `mongodb://mongo:27017`).
- `DB_NAME`: MongoDB database name (default: `vizzuality`).
- `BATCH_SIZE`: Number of records to process in each batch (default: `1000`).
- `DOWNLOAD_JOB_INTERVAL`: Interval for polling download jobs in milliseconds (default: `1000`).
- `CONCURRENT_DOWNLOADS`: Number of concurrent download workers (default: number of CPU cores).
- `DELETE_ON_ABORT`: Whether to delete data on job abort (default: `true`).

## Good Practices and Production Considerations

While the project follows several best practices, there are additional considerations for a production environment:

- **Security Enhancements**: Implement authentication and authorization to secure the API endpoints.
- **Input Validation**: Enhance validation to prevent injection attacks and ensure data integrity.
- **Error Handling**: Implement more granular error handling and logging, possibly integrating with monitoring tools.
- **Scalability**: Use a message queue like RabbitMQ or Kafka for better job management and scalability.
- **Configuration Management**: Use a configuration service or secrets manager for sensitive data.
- **Deployment**: Container orchestration using Kubernetes for better scaling and management.
- **Testing**: Implement integration and end-to-end tests to cover more scenarios.
- **CI/CD Pipeline**: Set up continuous integration and deployment pipelines.
- **Documentation**: Use tools like Swagger/OpenAPI for API documentation.

## Matching Challenge Criteria

The solution meets the requirements of the challenge in the following ways:

- **Three Endpoints Implemented**:
  - **Start Import**: `POST /url` accepts a URL and begins the import process.
  - **Check Status**: `GET /url/:id` returns the status of the import job.
  - **Cancel Import**: `DELETE /url/:id` allows cancellation of an ongoing import.

- **Handling Large CSV Files**:
  - The application processes the CSV file in a streaming fashion to handle large files efficiently.
  - It uses batching to insert records into MongoDB without consuming excessive memory.

- **Status Reporting**:
  - Provides detailed status, including percentage completed and ETA.
  - Stores status information in MongoDB for persistence.

- **Cancellation Feature**:
  - Allows users to cancel running imports.
  - Cleans up resources and optionally deletes inserted data upon cancellation.

- **Docker Compose Setup**:
  - Includes a `compose.yaml` file for easy deployment.
  - Services are containerized for consistency and portability.

- **Tests Implemented**:
  - Unit tests are provided for critical components.
  - Instructions for running tests are included.

- **Optional Goals Achieved**:
  - **Complex Status Reporting**: Includes percentage completion and ETA.
  - **Testing Strategy**: Automated tests and manual testing instructions are provided.

## LLM Usage

As per the challenge guidelines, the following tasks were assisted by a Large Language Model (LLM):

- **Project Scaffolding**: Initial setup of the TypeScript project structure.
- **Development**: Implementing some of the boilerplate code for Express routes and services.
- **Writing Tests**: Generating test cases for the API endpoints and worker functions.
- **Documentation**: Assisting in drafting this `README.md` file.

## Conclusion

This project demonstrates an effective solution for importing large CSV files into a database using a scalable and efficient architecture. It meets the requirements specified in the challenge and includes additional features that enhance its functionality.