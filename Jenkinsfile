pipeline {
    agent any

    environment {
        // Load environment variables from .env file
        SMTP_CONFIG = credentials('jenkins-smtp-config')
        SMTP_HOST = "${SMTP_CONFIG_USR}"
        SMTP_PORT = "${SMTP_CONFIG_PSW}"
        NODE_VERSION = '18'
        // Other env vars will be loaded from .env
    }

    options {
        // Load .env file before pipeline execution
        withEnv(["DOTENV_PATH=${WORKSPACE}/jenkins/.env"]) {
            withCredentials([file(credentialsId: 'jenkins-env-file', variable: 'ENV_FILE')]) {
                sh 'cp $ENV_FILE $DOTENV_PATH'
            }
        }
    }

    triggers {
        // This enables GitHub webhook trigger
        githubPush()
    }

    stages {
        stage('Load Environment') {
            steps {
                script {
                    // Load all variables from .env file
                    def props = readProperties file: "${WORKSPACE}/jenkins/.env"
                    env.SMTP_HOST = props.SMTP_HOST
                    env.SMTP_PORT = props.SMTP_PORT
                    env.SMTP_USER = props.SMTP_USER
                    env.SMTP_PASSWORD = props.SMTP_PASSWORD
                    env.SMTP_FROM = props.SMTP_FROM
                    env.SMTP_TO = props.SMTP_TO
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