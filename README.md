GradeTracker Local (Docker Version)

A self-hosted, secure grade tracking application designed to run locally on your own machine or server.

🚀 Quick Start Guide

This guide assumes you have Docker and Docker Compose installed on your system.

1. Download the Project

First, clone this repository to your machine:

git clone [https://github.com/carter-nathanc/gradebook-assignment-tracker.git](https://github.com/carter-nathanc/gradebook-assignment-tracker.git)
cd gradebook-assignment-tracker


2. Start the Application

Run the following command to build and start the server. This will download necessary dependencies and set up the environment automatically.

docker-compose up -d --build


up: Starts the containers defined in docker-compose.yml.

-d: Runs the container in "detached" mode (in the background).

--build: Forces a rebuild of the Docker image to ensure you have the latest code.

3. Get Your Secure Login Key (Important!)

On the very first run, the system generates a random Access Key for security. You need this key to log in.

Run this command to view the logs and find your key:

docker-compose logs gradetracker


Look for output similar to this:

---------------------------------------------------
🔑 NEW ACCESS KEY GENERATED
---------------------------------------------------

    a1b2c3d4e5f6... (Your unique key will be here)

⚠️  COPY THIS KEY NOW. It is not stored in plain text!
---------------------------------------------------


Copy that key immediately. It is hashed securely after generation, so this is the only time you will see it in plain text.

4. Access the App

Open your web browser and go to:

👉 http://localhost:2501

Enter the Access Key you copied in the previous step to log in.

🛠️ Data Management

Where is my data saved?

Your data (grades, assignments, and settings) is stored in a data/ folder inside your project directory. This folder is created automatically when you first run the app.

Backup: To backup your data, simply copy the data/ folder to a safe location.

Privacy: The data/ folder is ignored by Git, so your personal grades are never uploaded to the internet if you push code changes.

Resetting Your Password

If you lose your Access Key:

Stop the container: docker-compose down

Delete the authentication file: rm data/auth.json (Do NOT delete database.json if you want to keep your grades).

Restart the container: docker-compose up -d

Check the logs again for a new key: docker-compose logs gradetracker

🛑 Stopping the App

To stop the application server:

docker-compose down


🔧 For Developers: File Structure

server.js: The local Node.js server handling API requests and file storage.

install.js: A script that runs on startup to ensure the database and security keys exist.

src/: The React frontend code.

data/: (Generated locally) Stores database.json and auth.json.
