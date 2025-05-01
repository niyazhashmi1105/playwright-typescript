pipeline {
    agent any

    environment {
        NODE_VERSION = '18'
    }

    stages {
        stage('Load Environment') {
            steps {
                script {
                    // Source the environment loader script
                    sh """
                        chmod +x ${WORKSPACE}/jenkins/jenkins-env-loader.sh
                        . ${WORKSPACE}/jenkins/jenkins-env-loader.sh
                    """
                }
            }
        }

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