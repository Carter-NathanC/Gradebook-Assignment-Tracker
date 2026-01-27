# **GradeTracker Local (Docker Version)**

A self-hosted, secure grade tracking application designed to run locally on your own machine or server.

## **🚀 Quick Start Guide**

This guide assumes you have **Docker** and **Docker Compose** installed on your system.

### **1\. Download the Project**

Clone this repository to your machine:  
git clone [https://github.com/carter-nathanc/gradebook-assignment-tracker.git\](https://github.com/carter-nathanc/gradebook-assignment-tracker.git)  
cd gradebook-assignment-tracker

### **2\. Start the Application**

Run the following command to build and start the server. This will download necessary dependencies and set up the environment automatically.  
```
docker-compose up -d --build
```

* up: Starts the containers defined in docker-compose.yml.  
* \-d: Runs the container in "detached" mode (in the background).  
* \--build: Forces a rebuild of the Docker image to ensure you have the latest code.
### **3\. Get Your Secure Login Key (Important\!)**

On the very first run, the system generates a random **Access Key** for security. You need this key to log in.  
Run this command to view the logs and find your key:  
docker-compose logs gradetracker

**Look for output similar to this:**  
\---------------------------------------------------  
🔑 NEW ACCESS KEY GENERATED  
\---------------------------------------------------

    a1b2c3d4e5f6... (Your unique key will be here)

⚠️  COPY THIS KEY NOW. It is not stored in plain text\!  
\---------------------------------------------------

**Copy that key immediately.** It is hashed securely after generation, so this is the only time you will see it in plain text.

### **4\. Access the App**

Open your web browser and go to:  
👉 **http://localhost:2501**  
Enter the Access Key you copied in the previous step to log in.

## **🎓 Custom Grading Logic**

GradeTracker allows you to customize how grades are calculated for each class.

1. **Open Class Settings:** Navigate to a class and click the **Wrench Icon** (Settings) in the top right of the class header.  
2. **Go to "Grading" Tab:** Select the grading method:  
   * **Total Points:** Simple calculation: (Total Points Earned / Total Points Possible) \* 100\.  
   * **Weighted:** Assign percentage weights to categories (e.g., Homework 40%, Exams 60%). The app calculates the weighted average.  
   * **Custom Logic:** For advanced users who need specific rules.

### **How to use Custom Logic**

The "Custom Logic" allows you to document specific complex rules for a class, such as "Final Exam replaces lowest midterm score if higher."  
*Note: The app defaults to "Total Points" if Custom Logic is selected, but you can use the text area to save your specific rules for reference.*

### **Using "Rules" (Drop Lowest)**

For automated rule handling, use the **Rules** tab in Class Settings:

1. Click **\+ ADD RULE**.  
2. Select **Drop Lowest**.  
3. Enter the number of assignments to drop (e.g., "1").  
4. Select the **Category** (e.g., "Homework").  
5. Save. The app will automatically recalculate your grade, ignoring the lowest score(s) in that category.

## **🔄 Updating the App**

When new features or bug fixes are released, follow these steps to update **without losing your data**:

1. **Pull the latest code:**  
   git pull origin main

2. **Rebuild the container:**  
   This updates the application code inside the Docker container while keeping your data/ folder intact (since it's mounted as a volume).  
   docker-compose up \-d \--build

3. **Done\!** Your grades and settings will still be there.

## **🛠️ Data Management**

### **Where is my data saved?**

Your data (grades, assignments, and settings) is stored in a data/ folder inside your project directory. This folder is created automatically when you first run the app.

* **Backup:** To backup your data, simply copy the data/ folder to a safe location.  
* **Privacy:** The data/ folder is ignored by Git, so your personal grades are never uploaded to the internet if you push code changes.

### **🔑 Resetting Your Password (Terminal)**

If you forget your Access Key, you can reset it directly from the terminal without losing your grades.

1. **Stop the container:**  
   docker-compose down

2. **Delete the authentication file:**  
   **WARNING:** Only delete auth.json. Do NOT delete database.json (that's your grades\!).  
   rm data/auth.json

3. **Restart the container:**  
   docker-compose up \-d

4. **Get your NEW key:**  
   The system will detect the missing auth file and generate a brand new key.  
   docker-compose logs gradetracker

   *Look for the new yellow key in the logs.*

## **🛑 Stopping the App**

To stop the application server:  
docker-compose down  
