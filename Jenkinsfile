pipeline {
  agent any

  options {
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  parameters {
    choice(
      name: 'BRANCH',
      choices: ['v1.4', 'v1.3'],
      description: 'Git branch to deploy'
    )
    booleanParam(
      name: 'SKIP_HEALTH_CHECK',
      defaultValue: false,
      description: 'Skip post-deploy health check (not recommended)'
    )
  }

  environment {
    APP_DIR     = '/opt/ecom'
    COMPOSE_FILE = 'docker-compose.prod.yml'
  }

  stages {
    stage('Preflight') {
      steps {
        sh '''
          set -e
          test -d "${APP_DIR}" || { echo "APP_DIR ${APP_DIR} missing"; exit 1; }
          test -f "${APP_DIR}/.env.production" || { echo ".env.production missing"; exit 1; }
          test -f "${APP_DIR}/scripts/deploy.sh" || { echo "deploy.sh missing — pull repo first"; exit 1; }
          docker compose version || docker-compose version
        '''
      }
    }

    stage('Deploy') {
      steps {
        sh """
          set -e
          export APP_DIR='${APP_DIR}'
          export BRANCH='${params.BRANCH}'
          export COMPOSE_FILE='${COMPOSE_FILE}'
          export SKIP_HEALTH_CHECK='${params.SKIP_HEALTH_CHECK}'
          bash '${APP_DIR}/scripts/deploy.sh'
        """
      }
    }
  }

  post {
    success {
      echo "✅ Production deploy succeeded (branch: ${params.BRANCH})"
    }
    failure {
      echo "❌ Production deploy FAILED (branch: ${params.BRANCH})"
      sh """
        cd '${APP_DIR}' || exit 0
        docker compose -f '${COMPOSE_FILE}' ps || true
        docker compose -f '${COMPOSE_FILE}' logs --tail=50 backend || true
      """
    }
  }
}
