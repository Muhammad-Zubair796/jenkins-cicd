pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                // This tells Jenkins to go into the subfolder where pom.xml lives
                dir('jenkins') { 
                    // Use 'bat' instead of 'sh' if your Jenkins server is running on Windows
                    sh './mvnw clean package' 
                }
            }
        }
    }
}