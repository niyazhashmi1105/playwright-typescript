pipeline {
    agent any

    environment {
        // Add environment variables if needed
        NODE_VERSION = '18'
    }

    triggers {
        // This enables GitHub webhook trigger
        githubPush()
    }

    stages {
        stage('Checkout') {
            steps {
                // Clean workspace before checkout
                cleanWs()
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    npm install
                    npx playwright install
                '''
            }
        }

        stage('Run Tests') {
            steps {
                sh 'npm test'
            }
        }
    }

    post {
        always {
            // Clean up workspace
            cleanWs()
        }
    }
}