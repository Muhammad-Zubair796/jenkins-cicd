// ==========================================
// 1. ENGINEERING POST-MORTEM DATABASE (TIMELINE)
// ==========================================
const pipelineSteps = [
    {
        title: "Application Compilation & Artifact Generation",
        node: "Developer",
        terminalUser: "ubuntu@aws-ec2-instance:~/jenkins-cicd/jenkins",
        terminalPrompt: "ubuntu@ip-172-31-22-184:~/jenkins-cicd/jenkins$",
        context: "Initiated the Maven build lifecycle to compile the Spring Boot source code, execute unit tests, and package the application into a deployable JAR artifact.",
        error: "No errors encountered. The codebase was structurally sound and dependencies resolved correctly.",
        resolution: "Standard execution. The artifact was successfully generated in the /target directory, validating the application's readiness for containerization.",
        command: "mvn clean package",
        terminalOutput: "[INFO] Replacing main artifact /home/ubuntu/jenkins-cicd/jenkins/target/jenkins-0.0.1-SNAPSHOT.jar with repackaged archive...\n[INFO] ------------------------------------------------------------------------\n[INFO] BUILD SUCCESS\n[INFO] ------------------------------------------------------------------------\n[INFO] Total time:  18.695 s",
        screenshot: "mvn clean package.PNG"
    },
    {
        title: "Docker Daemon Socket Permission Resolution",
        node: "Developer",
        terminalUser: "ubuntu@aws-ec2-instance:~/jenkins-cicd/jenkins",
        terminalPrompt: "ubuntu@ip-172-31-22-184:~/jenkins-cicd/jenkins$",
        context: "Attempted to build the Docker image locally to verify the Dockerfile instructions before integrating it into the automated Jenkins pipeline.",
        error: "dial unix /var/run/docker.sock: connect: permission denied\nCannot connect to the Docker daemon.",
        resolution: "Root Cause: The Unix socket for Docker is owned by the 'root' group by default. The 'ubuntu' user lacked execution privileges.\n\nFix: Appended the user to the 'docker' secondary group via 'usermod' and reloaded the session environment using 'newgrp' to apply permissions without dropping the SSH connection.",
        command: "sudo usermod -aG docker $USER\nnewgrp docker\ndocker build -t my-jenkins-app:v1 .",
        terminalOutput: "Sending build context to Docker daemon  21.56MB\nStep 1/4 : FROM eclipse-temurin:17-jre-alpine\nStep 4/4 : ENTRYPOINT [\"java\", \"-jar\", \"app.jar\"]\nSuccessfully built 25ed02f7b8dc\nSuccessfully tagged my-jenkins-app:v1",
        screenshot: "dockerbuild.PNG"
    },
    {
        title: "Container Port Translation & Routing",
        node: "Docker Hub",
        terminalUser: "ubuntu@aws-ec2-instance:~/jenkins-cicd/jenkins",
        terminalPrompt: "ubuntu@ip-172-31-22-184:~/jenkins-cicd/jenkins$",
        context: "Executed the containerized Spring Boot application to verify runtime stability and network accessibility.",
        error: "curl: (7) Failed to connect to localhost port 8080: Connection refused",
        resolution: "Root Cause: The embedded Tomcat server inside the Spring Boot application was configured to initialize on port 8081, but standard traffic was being routed to 8080.\n\nFix: Terminated the orphaned container and executed a new detached instance with explicit port translation (-p 8080:8081), bridging the host network to the container's internal listener.",
        command: "docker rm -f 9018e914bc2c\ndocker run -d -p 8080:8081 my-jenkins-app:v1",
        terminalOutput: "o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port 8081 (http)\nc.e.j.JenkinsApplication  : Started JenkinsApplication in 3.548 seconds\n\n$ docker run -d -p 8080:8081 my-jenkins-app:v1\n4c21a97d029b8063e4be49fe2c6a72f079fad8c7359a73512c8ca505feeba16a",
        screenshot: "dockerizingApp.PNG"
    },
    {
        title: "Systemd Drop-in Override for Java Runtimes",
        node: "Jenkins",
        terminalUser: "ubuntu@aws-ec2-instance:~",
        terminalPrompt: "ubuntu@ip-172-31-22-184:~$",
        context: "Attempted to initialize the Jenkins CI/CD orchestrator service on the host machine.",
        error: "Job for jenkins.service failed.\nRunning with Java 17... which is older than the minimum required version (Java 21). Supported Java versions are: [21, 25]",
        resolution: "Root Cause: Jenkins v2.572 deprecated Java 17. However, altering the global OS Java path would break the host's application environment.\n\nFix: Installed OpenJDK 21 in parallel and engineered a Systemd drop-in override (/etc/systemd/system/jenkins.service.d/override.conf). This injected the Java 21 binary path strictly into the Jenkins daemon's execution context, leaving the global OS safely on Java 17.",
        command: "sudo mkdir -p /etc/systemd/system/jenkins.service.d/\necho -e \"[Service]\\nEnvironment=\\\"JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64\\\"\" | sudo tee /etc/systemd/system/jenkins.service.d/override.conf\nsudo systemctl daemon-reload && sudo systemctl restart jenkins",
        terminalOutput: "● jenkins.service - Jenkins Continuous Integration Server\n   Active: active (running) since Sat 2026-07-11 05:47:36 UTC\n           └─10058 /usr/lib/jvm/java-21-openjdk-amd64/bin/java -jar /usr/share/java/jenkins.war",
        screenshot: "startJenkins.PNG"
    },
    {
        title: "Jenkins Orchestrator Initialization",
        node: "Jenkins",
        terminalUser: "ubuntu@aws-ec2-instance:~",
        terminalPrompt: "ubuntu@ip-172-31-22-184:~$",
        context: "Accessed the Jenkins web interface to unlock the system and configure the initial pipeline workspace.",
        error: "No errors. Service bound successfully to 0.0.0.0:8080.",
        resolution: "Extracted the auto-generated cryptographic admin payload from the Jenkins secrets directory to bypass the initial security lock and provision the dashboard.",
        command: "sudo cat /var/lib/jenkins/secrets/initialAdminPassword",
        terminalOutput: "e6bd3f10f2e04a48936d06397594bfee\n\nInitialization complete. Welcome to the automated orchestrator dashboard.",
        screenshot: "jenkinsUI.PNG"
    },
    {
        title: "Kernel-Level Virtual Memory Allocation (Swap)",
        node: "SonarQube",
        terminalUser: "ubuntu@aws-ec2-instance:~",
        terminalPrompt: "ubuntu@ip-172-31-22-184:~$",
        context: "Prepared the host environment for SonarQube deployment. Evaluated system memory constraints on the 1GB EC2 instance.",
        error: "System Risk: Out-Of-Memory (OOM) Killer activation imminent. Running Jenkins, SonarQube, and Minikube concurrently requires >3GB RAM.",
        resolution: "Root Cause: Physical memory starvation.\n\nFix: Engineered a 2GB virtual memory swap block directly on the NVMe storage partition. Formatted the block via 'mkswap' and activated it via 'swapon', providing the kernel with sufficient paging space to prevent JVM crashes.",
        command: "sudo fallocate -l 2G /swapfile\nsudo chmod 600 /swapfile\nsudo mkswap /swapfile\nsudo swapon /swapfile\nfree -h",
        terminalOutput: "               total        used        free      shared  buff/cache   available\nMem:           908Mi       790Mi       110Mi       2.5Mi       279Mi       245Mi\nSwap:          2.0Gi          0B       2.0Gi",
        screenshot: "swappic.PNG"
    },
    {
        title: "SonarQube SAST Deployment & RBAC Fix",
        node: "SonarQube",
        terminalUser: "sonarqube@aws-ec2-instance:~",
        terminalPrompt: "sonarqube@ip-172-31-22-184:~$",
        context: "Deployed SonarQube to establish a Static Application Security Testing (SAST) quality gate.",
        error: "java.lang.RuntimeException: can not run elasticsearch as root\nProcess exited with exit value [ElasticSearch]: 1",
        resolution: "Root Cause: The embedded Elasticsearch database enforces strict Role-Based Access Control (RBAC) and intentionally panics if executed by the 'root' user to prevent privilege escalation attacks.\n\nFix: Transferred binaries to /opt/sonarqube, recursively modified ownership (chown) to a dedicated, unprivileged 'sonarqube' service account, and executed the daemon safely.",
        command: "sudo chown -R sonarqube:sonarqube /opt/sonarqube\nsu - sonarqube\n/opt/sonarqube/bin/linux-x86-64/sonar.sh start",
        terminalOutput: "Starting SonarQube...\nStarted SonarQube.\n\n$ /opt/sonarqube/bin/linux-x86-64/sonar.sh status\nSonarQube is running (27734).",
        screenshot: "startSonar.PNG"
    },
    {
        title: "SonarQube API Token Generation",
        node: "SonarQube",
        terminalUser: "sonarqube@aws-ec2-instance:~",
        terminalPrompt: "sonarqube@ip-172-31-22-184:~$",
        context: "Configured secure authentication for the Jenkins Maven scanner to publish analysis reports to the SonarQube API.",
        error: "No errors. Security policy enforcement.",
        resolution: "Generated a cryptographic User Token in the SonarQube UI. This adheres to zero-trust principles by avoiding the use of raw administrative passwords in CI/CD pipeline scripts.",
        command: "SonarQube UI -> My Account -> Security -> Generate Tokens",
        terminalOutput: "New token \"jenkins\" has been successfully created.\nValue: sqa_83dfec58ed512586e03745ce3b3b3853e392d...",
        screenshot: "sonarTokengeneration.PNG"
    },
    {
        title: "Jenkins Credentials Vault Integration",
        node: "Jenkins",
        terminalUser: "ubuntu@aws-ec2-instance:~",
        terminalPrompt: "ubuntu@ip-172-31-22-184:~$",
        context: "Injected the SonarQube API token into the Jenkins orchestrator.",
        error: "No errors. Secret management configuration.",
        resolution: "Stored the token as a 'Secret Text' credential in the Jenkins global vault. The pipeline uses the withCredentials() block to decrypt and inject this token at runtime, ensuring it is masked in all console logs.",
        command: "Jenkins UI -> Manage Jenkins -> Credentials -> Global -> Add Credentials",
        terminalOutput: "Scope: Global\nKind: Secret text\nSecret: **************************\nID: sonarqube",
        screenshot: "sonartokeninjenkins.PNG"
    },
    {
        title: "Static Code Analysis & Quality Gate Validation",
        node: "SonarQube",
        terminalUser: "sonarqube@aws-ec2-instance:~",
        terminalPrompt: "sonarqube@ip-172-31-22-184:~$",
        context: "Executed the SonarScanner via Maven to analyze the codebase for vulnerabilities, bugs, and code smells.",
        error: "No errors. The codebase passed all strict quality gate thresholds.",
        resolution: "The scanner successfully compiled the AST (Abstract Syntax Tree), analyzed the bytecode, and transmitted the telemetry to the SonarQube server. The project achieved a 'PASSED' status across all security metrics.",
        command: "mvn sonar:sonar -Dsonar.login=$SONAR_AUTH_TOKEN -Dsonar.host.url=http://107.21.164.185:9000",
        terminalOutput: "[INFO] ANALYSIS SUCCESSFUL, you can find the results at: http://107.21.164.185:9000/dashboard?id=com.example%3Ajenkins\n[INFO] Note that you will be able to access the updated dashboard once the server has processed the submitted report.",
        screenshot: "sonaranalysis.PNG"
    },
    {
        title: "Hardware Scaling & Persistent Swap Recovery",
        node: "SonarQube",
        terminalUser: "ubuntu@aws-ec2-instance:~",
        terminalPrompt: "ubuntu@ip-172-31-22-184:~$",
        context: "Resized the AWS EC2 instance from t3.micro (1GB) to t3.small (2GB) to support the Kubernetes control plane. Attempted to restart SonarQube post-migration.",
        error: "max virtual memory areas vm.max_map_count [65530] is too low, increase to at least [262144]\nProcess exited with exit value [ElasticSearch]: 1",
        resolution: "Root Cause: The hardware reboot wiped the temporary Swap configuration and reset the kernel's 'vm.max_map_count' parameter to default, starving Elasticsearch of memory maps.\n\nFix: Permanently registered the Swap file in '/etc/fstab' and injected the required memory map limits into '/etc/sysctl.conf' to ensure persistence across all future reboots.",
        command: "sudo sysctl -w vm.max_map_count=262144\necho 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf\nsudo swapon /swapfile\nsu - sonarqube\n/opt/sonarqube/bin/linux-x86-64/sonar.sh start",
        terminalOutput: "Starting SonarQube...\nStarted SonarQube.\n\n$ /opt/sonarqube/bin/linux-x86-64/sonar.sh status\nSonarQube is running (10380).",
        screenshot: "restartsonar with new ip.PNG"
    },
    {
        title: "Kubernetes Control Plane Provisioning",
        node: "Docker Hub",
        terminalUser: "ubuntu@aws-ec2-instance:~",
        terminalPrompt: "ubuntu@ip-172-31-22-184:~$",
        context: "Bootstrapped a single-node Kubernetes cluster using Minikube to serve as the deployment target for the GitOps pipeline.",
        error: "Exiting due to RSRC_INSUFFICIENT_REQ_MEMORY: Requested memory 1800MB is less than the strict minimum of 2048MB.",
        resolution: "Root Cause: Minikube enforces strict hardware checks. The t3.small instance only has 2GB total RAM, leaving insufficient overhead.\n\nFix: Purged the stale cluster profile and forced the Docker driver to allocate exactly 1800MB, utilizing the previously configured Swap space to handle the overflow.",
        command: "minikube delete\nminikube start --driver=docker --memory=1800mb",
        terminalOutput: "* Using Docker driver with root privileges...\n* Creating docker container (CPUs=2, Memory=1800MB) ...\n* Preparing Kubernetes v1.35.1 on Docker 29.2.1 ...\n* Done! kubectl is now configured to use \"minikube\" cluster",
        screenshot: "startMinikube.PNG"
    },
    {
        title: "Argo CD Operator & OLM Deployment",
        node: "GitOps",
        terminalUser: "ubuntu@aws-ec2-instance:~",
        terminalPrompt: "ubuntu@ip-172-31-22-184:~$",
        context: "Deployed the Operator Lifecycle Manager (OLM) and the Argo CD Operator to enable declarative GitOps synchronization on the cluster.",
        error: "No errors. CRDs and namespaces initialized successfully.",
        resolution: "Executed the upstream OLM installation script and applied the Argo CD subscription manifest. Verified that the operator transitioned to the 'Succeeded' phase in the 'operators' namespace.",
        command: "curl -sL https://github.com/operator-framework/operator-lifecycle-manager/releases/download/v0.45.0/install.sh | bash -s v0.45.0\nkubectl create -f https://operatorhub.io/install/argocd-operator.yaml",
        terminalOutput: "namespace/olm created\nnamespace/operators created\nsubscription.operators.coreos.com/my-argocd-operator created\n\n$ kubectl get csv -n operators\nNAME                      DISPLAY   VERSION   PHASE\nargocd-operator.v0.18.0   Argo CD   0.18.0    Succeeded",
        screenshot: "argocd.PNG"
    },
    {
        title: "Automated CI/CD Pipeline Execution",
        node: "GitOps",
        terminalUser: "ubuntu@aws-ec2-instance:~/jenkins-cicd",
        terminalPrompt: "ubuntu@ip-172-31-22-184:~/jenkins-cicd$",
        context: "Triggered the fully automated Jenkins declarative pipeline to compile, test, scan, build, publish, and update the GitOps manifests.",
        error: "Exit code -2: Process leaked file descriptors / Workspace lockup.",
        resolution: "Root Cause: Mixing global Docker agents with 'agent any' overrides caused Jenkins to spawn secondary workspaces (jenkins@2), which deadlocked under memory pressure.\n\nFix: Refactored the Jenkinsfile to use a global 'agent any' (single workspace) and scoped the Docker Maven container strictly to the Build and Analysis stages. The pipeline executed flawlessly in 3m 13s.",
        command: "Jenkins UI -> Run Pipeline #14 -> Successful GitOps Commit Push",
        terminalOutput: "+ sed -i s/replaceImageTag/14/g spring-boot-app-manifests/deployment.yml\n+ git add spring-boot-app-manifests/deployment.yml\n+ git commit -m chore: update deployment image tag to 14 [skip ci]\n+ git push https://****@github.com/Muhammad-Zubair796/jenkins-cicd HEAD:main\nFinished: SUCCESS",
        screenshot: "pipelinefinished.PNG"
    },
    {
        title: "Pipeline Stage Visualization",
        node: "GitOps",
        terminalUser: "ubuntu@aws-ec2-instance:~/jenkins-cicd",
        terminalPrompt: "ubuntu@ip-172-31-22-184:~/jenkins-cicd$",
        context: "Visualized the successful execution of all declarative stages in the Jenkins UI.",
        error: "No errors. All stages passed.",
        resolution: "Confirmed that the Continuous Integration (Checkout, Build, Test, SAST) and Continuous Delivery (Docker Build, Push, GitOps Sync) phases executed sequentially without manual intervention.",
        command: "Jenkins Dashboard -> Pipeline Stage View",
        terminalOutput: "Stage View:\n[Checkout SCM] [Initialization] [Build & Unit Test] [Static Analysis] [Image Build & Publish] [Gitops Synchronization]\nStatus: SUCCESS",
        screenshot: "stages.PNG"
    },
    {
        title: "Argo CD Authentication & Bcrypt Hashing",
        node: "GitOps",
        terminalUser: "ubuntu@aws-ec2-instance:~",
        terminalPrompt: "ubuntu@ip-172-31-22-184:~$",
        context: "Attempted to authenticate into the Argo CD web dashboard to monitor the GitOps synchronization.",
        error: "Invalid username or password.",
        resolution: "Root Cause: The Kubernetes secret contained a dummy bcrypt hash from upstream documentation, locking out the admin account.\n\nFix: Installed 'apache2-utils', generated a valid bcrypt hash using 'htpasswd', patched the 'argocd-secret' via kubectl, and deleted the 'argocd-server' pod to force a credential reload.",
        command: "htpasswd -bnBC 10 \"\" MyNewPassword123 | tr -d ':\\n'\nkubectl -n operators patch secret argocd-secret -p '{\"stringData\": {\"admin.password\": \"$2y$10$...\"}}'\nkubectl delete pod -l app.kubernetes.io/name=argocd-server -n operators",
        terminalOutput: "1fBChKNkb36OVFmhlfHxuOBkt1f6ERKeqssj4GZtGo5qFFapNfU8O\nsecret/argocd-secret patched\npod \"argocd-server-7bf7b87d87-cfvr5\" deleted",
        screenshot: "argocd ui.PNG"
    },
    {
        title: "GitOps Sync & API CPU Starvation Mitigation",
        node: "GitOps",
        terminalUser: "ubuntu@aws-ec2-instance:~",
        terminalPrompt: "ubuntu@ip-172-31-22-184:~$",
        context: "Configured the Argo CD Application to sync the GitHub manifests to the cluster.",
        error: "ComparisonError: net/http: TLS handshake timeout\nOriginal error: context cancellation while reading body",
        resolution: "Root Cause: The t3.small instance suffered extreme CPU starvation (Load Average: 40+) due to OLM catalog operators crash-looping, which froze the Kubernetes API server.\n\nFix: Forcefully scaled down the 'catalog-operator' and 'olm-operator' to 0 replicas to halt the death spiral. Restarted Minikube to flush the API cache. Argo CD successfully connected, pulled image tag 14, and deployed the pods.",
        command: "kubectl scale deployment catalog-operator -n olm --replicas=0\nkubectl scale deployment olm-operator -n olm --replicas=0\nminikube start",
        terminalOutput: "deployment.apps/catalog-operator scaled\ndeployment.apps/olm-operator scaled\n\nspring-boot-app-gitops   Synced   Healthy\nspring-boot-app-5459c9678b-bj9ck   1/1   Running",
        screenshot: "argocd2.PNG"
    },
    {
        title: "Production Application Verification",
        node: "GitOps",
        terminalUser: "ubuntu@aws-ec2-instance:~",
        terminalPrompt: "ubuntu@ip-172-31-22-184:~$",
        context: "Verified the final state of the deployed Spring Boot application running inside the Kubernetes cluster.",
        error: "No errors. Pods are healthy and serving traffic.",
        resolution: "Executed a port-forward on the Kubernetes service to expose the internal cluster IP to the EC2 instance's public interface. Successfully accessed the live application via Chrome, proving the end-to-end GitOps pipeline is fully operational.",
        command: "kubectl port-forward --address 0.0.0.0 svc/spring-boot-app-service 8085:80 -n operators",
        terminalOutput: "Forwarding from 0.0.0.0:8085 -> 8081\nHandling connection for 8085\nHandling connection for 8085",
        screenshot: "app.PNG"
    }
];

// ==========================================
// 2. CODEBASE & ARCHITECTURE DATABASE
// ==========================================
const codebaseFiles = [
    {
        id: "architecture",
        name: "Architecture Flow",
        tool: "System Design",
        language: "plaintext",
        code: `1. DEVELOPER PUSH: Code is pushed to GitHub.
2. JENKINS CI: Jenkins pulls code, runs Maven tests, and triggers SonarQube SAST scan.
3. DOCKER BUILD: Jenkins builds the Docker image and pushes it to Docker Hub.
4. GITOPS UPDATE: Jenkins edits 'deployment.yml' with the new image tag and pushes it back to GitHub.
5. ARGOCD CD: ArgoCD detects the GitHub change, pulls the new manifest, and applies it to Kubernetes.
6. KUBERNETES: Minikube spins up the new pods and routes traffic via the Service.`,
        explanation: "This represents the complete, automated GitOps lifecycle. The key philosophy here is that GitHub acts as the 'Single Source of Truth'. Jenkins handles the heavy lifting of building and testing (Continuous Integration), but it never touches the production servers directly. Instead, Jenkins updates GitHub, and ArgoCD (Continuous Deployment) pulls those changes into the cluster. This ensures high security and perfect audit trails."
    },
    {
        id: "dockerfile",
        name: "Dockerfile",
        tool: "Docker",
        language: "dockerfile",
        code: `# Use Java 17 to match your Maven build
FROM eclipse-temurin:17-jre-alpine

WORKDIR /opt/app

# This copies whatever .jar file Maven created in the target folder
COPY target/*.jar app.jar

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]`,
        explanation: "This file dictates how the application is containerized. \n\nWhy this way? We use 'eclipse-temurin:17-jre-alpine' because it is a highly secure, stripped-down version of Linux that only contains the Java Runtime Environment (JRE). We don't need the full JDK because Jenkins already compiled the code. This keeps the final Docker image extremely small and reduces the security attack surface."
    },
    {
        id: "deployment",
        name: "deployment.yml",
        tool: "Kubernetes / ArgoCD",
        language: "yaml",
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: spring-boot-app
  labels:
    app: spring-boot-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: spring-boot-app
  template:
    metadata:
      labels:
        app: spring-boot-app
    spec:
      containers:
      - name: spring-boot-app
        image: adrainbialon/ultimate-cicd:14
        ports:
        - containerPort: 8081`,
        explanation: "This is the Declarative Infrastructure manifest for Kubernetes. \n\nHow it works: It tells Kubernetes to ensure exactly 2 replicas (pods) of the application are running at all times for high availability. \n\nThe Magic: Notice the image tag '14'. In the raw repository, this says 'replaceImageTag'. Jenkins uses a Linux 'sed' command to dynamically swap that placeholder with the actual build number before ArgoCD deploys it."
    },
    {
        id: "service",
        name: "service.yml",
        tool: "Kubernetes",
        language: "yaml",
        code: `apiVersion: v1
kind: Service
metadata:
  name: spring-boot-app-service
spec:
  type: NodePort
  ports:
  - name: http
    port: 80
    targetPort: 8081
    nodePort: 30007  
    protocol: TCP
  selector:
    app: spring-boot-app`,
        explanation: "This file handles internal and external networking for the cluster. \n\nWhy it's needed: Kubernetes pods are ephemeral—they die and get new IP addresses constantly. This Service acts as a permanent load balancer. It listens on port 80 and routes traffic to 'targetPort: 8081' (where our Spring Boot Tomcat server is listening). The 'NodePort: 30007' exposes it to the outside world."
    },
    {
        id: "jenkinsfile",
        name: "Jenkinsfile",
        tool: "Jenkins",
        language: "groovy",
        code: `pipeline {
    agent any // Global execution on the host server

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
        stage('Build & Unit Test') {
            agent {
                docker {
                    image 'maven:3.9.6-eclipse-temurin-17-alpine'
                    args '--user root'
                }
            }
            steps {
                dir("\${SUB_DIR}") {
                    sh 'mvn clean package'
                }
            }
        }

        stage('Gitops Synchronization') {
            steps {
                withCredentials([string(credentialsId: "\${GITHUB_CRED_ID}", variable: 'GITHUB_TOKEN')]) {
                    sh """
                        git config user.email "\${GITHUB_EMAIL}"
                        git config user.name "\${GITHUB_USER}"
                        
                        sed -i "s/replaceImageTag/\${BUILD_NUMBER}/g" spring-boot-app-manifests/deployment.yml
                        
                        git add spring-boot-app-manifests/deployment.yml
                        git commit -m "chore: update deployment image tag to \${BUILD_NUMBER} [skip ci]"
                        git push https://\${GITHUB_TOKEN}@github.com/\${GITHUB_USER}/\${GITHUB_REPO} HEAD:main
                    """
                }
            }
        }
    }
}`,
        explanation: "This is the core Orchestrator script written in Groovy. \n\nKey Engineering Decisions:\n1. Agent Isolation: We use a global 'agent any' to prevent workspace lockups, but we spin up an isolated Docker container specifically for the Maven build. This ensures the build environment is perfectly clean every time.\n2. Security: We use 'withCredentials' to inject the GitHub and SonarQube tokens at runtime. They are never hardcoded.\n3. GitOps Sync: The 'sed' command dynamically updates the Kubernetes manifest, and '[skip ci]' in the commit message prevents Jenkins from triggering an infinite build loop when it pushes back to GitHub."
    }
];

// ==========================================
// 3. CORE APP LOGIC & UI RENDERING
// ==========================================
let currentStepIdx = 0;
let typingInterval;
const nodesList = ["Developer", "GitHub", "Jenkins", "SonarQube", "Docker Hub", "GitOps"];

function initPipeline() {
    renderNodes();
    updateUI();
    renderFileList();
    selectFile('architecture'); // Default file view
}

// --- VIEW TOGGLING ---
function toggleView(view) {
    const pipelineView = document.getElementById('view-pipeline');
    const codebaseView = document.getElementById('view-codebase');
    const btnPipeline = document.getElementById('btn-view-pipeline');
    const btnCodebase = document.getElementById('btn-view-codebase');
    const controls = document.getElementById('pipeline-controls');

    if (view === 'pipeline') {
        pipelineView.classList.remove('hidden');
        pipelineView.classList.add('flex');
        codebaseView.classList.add('hidden');
        controls.classList.remove('hidden');
        
        btnPipeline.className = "px-4 py-1.5 text-sm font-semibold rounded-md bg-sky-600 text-white shadow transition-all";
        btnCodebase.className = "px-4 py-1.5 text-sm font-semibold rounded-md text-slate-400 hover:text-slate-200 transition-all";
    } else {
        pipelineView.classList.add('hidden');
        pipelineView.classList.remove('flex');
        codebaseView.classList.remove('hidden');
        controls.classList.add('hidden');
        
        btnCodebase.className = "px-4 py-1.5 text-sm font-semibold rounded-md bg-sky-600 text-white shadow transition-all";
        btnPipeline.className = "px-4 py-1.5 text-sm font-semibold rounded-md text-slate-400 hover:text-slate-200 transition-all";
    }
}

// --- CODEBASE VIEW LOGIC ---
function renderFileList() {
    const list = document.getElementById('file-list');
    list.innerHTML = '';
    
    codebaseFiles.forEach(file => {
        const btn = document.createElement('button');
        btn.id = `file-btn-${file.id}`;
        btn.className = "w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all flex items-center space-x-3";
        
        // Add icons based on file type
        let icon = "📄";
        if(file.id === 'architecture') icon = "🔄";
        if(file.id === 'dockerfile') icon = "🐳";
        if(file.language === 'yaml') icon = "☸️";
        if(file.language === 'groovy') icon = "☕";

        btn.innerHTML = `<span>${icon}</span> <span>${file.name}</span>`;
        btn.onclick = () => selectFile(file.id);
        list.appendChild(btn);
    });
}

function selectFile(fileId) {
    // Reset buttons
    codebaseFiles.forEach(f => {
        document.getElementById(`file-btn-${f.id}`).classList.remove('bg-slate-800', 'text-sky-400', 'border-l-2', 'border-sky-400');
    });
    
    // Highlight selected
    const activeBtn = document.getElementById(`file-btn-${fileId}`);
    activeBtn.classList.add('bg-slate-800', 'text-sky-400', 'border-l-2', 'border-sky-400');

    // Update content
    const file = codebaseFiles.find(f => f.id === fileId);
    document.getElementById('code-title').innerText = file.name;
    document.getElementById('code-tool-tag').innerText = file.tool;
    document.getElementById('code-explanation').innerText = file.explanation;
    
    const codeBlock = document.getElementById('code-block');
    codeBlock.className = `language-${file.language} shadow-2xl border border-slate-800`;
    codeBlock.textContent = file.code;
    
    // Trigger syntax highlighting
    hljs.highlightElement(codeBlock);
}

// --- PIPELINE TIMELINE LOGIC ---
function renderNodes() {
    const container = document.getElementById("pipelineNodes");
    container.innerHTML = "";
    
    nodesList.forEach((node) => {
        const nodeDiv = document.createElement("div");
        nodeDiv.className = "flex flex-col items-center z-10";
        nodeDiv.innerHTML = `
            <div id="nodeCircle-${node}" class="w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs transition-all duration-500">
                ${node.substring(0, 2)}
            </div>
            <span class="text-[10px] mt-2 text-slate-500 font-semibold uppercase tracking-wider">${node}</span>
        `;
        container.appendChild(nodeDiv);
    });
}

function typeWriter(text, elementId, speed) {
    let i = 0;
    const element = document.getElementById(elementId);
    element.innerHTML = "";
    clearInterval(typingInterval);
    
    const outputEl = document.getElementById("termOutput");
    outputEl.style.opacity = "0";

    typingInterval = setInterval(function() {
        if (i < text.length) {
            if (text.charAt(i) === '\n') {
                element.innerHTML += "<br><span class='text-emerald-400 font-bold'>" + document.getElementById("terminalPrompt").innerText + "</span> ";
            } else {
                element.innerHTML += text.charAt(i);
            }
            i++;
        } else {
            clearInterval(typingInterval);
            setTimeout(() => { outputEl.style.opacity = "1"; }, 300);
        }
    }, speed);
}

function switchTab(tabName) {
    ['context', 'error', 'resolution'].forEach(name => {
        const btn = document.getElementById(`tab-${name}`);
        btn.className = "flex-1 py-3 text-sm font-semibold text-slate-400 border-b-2 border-transparent hover:text-slate-200 transition-colors";
        document.getElementById(`content-${name}`).classList.remove('active');
    });

    const activeBtn = document.getElementById(`tab-${tabName}`);
    activeBtn.className = "flex-1 py-3 text-sm font-semibold text-sky-400 border-b-2 border-sky-400 transition-colors";
    document.getElementById(`content-${tabName}`).classList.add('active');
}

function updateUI() {
    const step = pipelineSteps[currentStepIdx];
    
    document.getElementById("stepNumber").innerText = `Phase ${currentStepIdx + 1} of ${pipelineSteps.length}`;
    document.getElementById("stepTitle").innerText = step.title;
    
    document.getElementById("content-context").innerText = step.context;
    document.getElementById("content-error").innerText = step.error;
    document.getElementById("content-resolution").innerText = step.resolution;
    
    document.getElementById("termOutput").innerText = step.terminalOutput;
    document.getElementById("stepScreenshot").src = step.screenshot;
    
    document.getElementById("terminalUser").innerText = step.terminalUser;
    document.getElementById("terminalPrompt").innerText = step.terminalPrompt;

    typeWriter(step.command, "termCommand", 25);

    nodesList.forEach((node) => {
        const element = document.getElementById(`nodeCircle-${node}`);
        if (element) {
            element.className = "w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs transition-all duration-500";
        }
    });

    const activeCircle = document.getElementById(`nodeCircle-${step.node}`);
    if (activeCircle) {
        activeCircle.className = "w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-xs transition-all duration-500 active-node";
    }

    document.getElementById("prevBtn").disabled = (currentStepIdx === 0);
    document.getElementById("nextBtn").innerText = (currentStepIdx === pipelineSteps.length - 1) ? "Complete" : "Next Phase";
    
    switchTab('context');
}

function nextStep() {
    if (currentStepIdx < pipelineSteps.length - 1) {
        currentStepIdx++;
        updateUI();
    }
}

function prevStep() {
    if (currentStepIdx > 0) {
        currentStepIdx--;
        updateUI();
    }
}

window.onload = initPipeline;