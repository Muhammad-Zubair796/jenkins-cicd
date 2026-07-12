pipeline {
    agent {
        docker {
            image 'maven:3.9.6-eclipse-temurin-17-alpine'
            args '--user root -v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    environment {
        SUB_DIR           = 'jenkins'
        DOCKER_HUB_USER   = 'adrainbialon'
        DOCKER_IMAGE_NAME = 'ultimate-cicd'
        DOCKER_CRED_ID    = 'docker-cred'
        SONAR_URL         = 'http://107.21.164.185:9000'
        SONAR_CRED_ID     = 'sonarqube'
        GITHUB_USER       = 'Muhammad-Zubair796'
        GITHUB_EMAIL      = 'adrainbialon@gmail.com'
        GITHUB_REPO       = 'jenkins-cicd'
        GITHUB_CRED_ID    = 'github'
    }

    stages {
        stage('Initialization') {
            steps {
                sh "echo 'Initializing build pipeline execution for build run: ${BUILD_NUMBER}'"
            }
        }

        stage('Build & Unit Test') {
            steps {
                dir("${SUB_DIR}") {
                    sh 'mvn clean package'
                }
            }
        }

        stage('Static Analysis') {
            steps {
                dir("${SUB_DIR}") {
                    withCredentials([string(credentialsId: "${SONAR_CRED_ID}", variable: 'SONAR_AUTH_TOKEN')]) {
                        sh "mvn sonar:sonar -Dsonar.login=${SONAR_AUTH_TOKEN} -Dsonar.host.url=${SONAR_URL}"
                    }
                }
            }
        }

        stage('Image Build & Publish') {
            steps {
                dir("${SUB_DIR}") {
                    script {
                        def imageTag = "${DOCKER_HUB_USER}/${DOCKER_IMAGE_NAME}:${BUILD_NUMBER}"
                        sh "docker build -t ${imageTag} ."
                        docker.withRegistry('https://index.docker.io/v1/', "${DOCKER_CRED_ID}") {
                            docker.image(imageTag).push()
                        }
                    }
                }
            }
        }

        stage('Gitops Synchronization') {
            steps {
                withCredentials([string(credentialsId: "${GITHUB_CRED_ID}", variable: 'GITHUB_TOKEN')]) {
                    sh """
                        git config user.email "${GITHUB_EMAIL}"
                        git config user.name "${GITHUB_USER}"
                        
                        sed -i "s/replaceImageTag/${BUILD_NUMBER}/g" spring-boot-app-manifests/deployment.yml
                        
                        git add ../spring-boot-app-manifests/deployment.yml
                        git commit -m "chore: update deployment image tag to ${BUILD_NUMBER} [skip ci]"
                        git push https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${GITHUB_REPO} HEAD:main
                    """
                }
            }
        }
    }
}
