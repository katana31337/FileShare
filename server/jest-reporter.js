const { DefaultReporter } = require('@jest/reporters');

class RussianReporter extends DefaultReporter {
  constructor(globalConfig) {
    super(globalConfig);
  }

  // Цвета для терминала
  colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
  };

  // Перевод статусов
  getStatusText(status) {
    const statusMap = {
      'passed': `${this.colors.green}✓ ПРОЙДЕН${this.colors.reset}`,
      'failed': `${this.colors.red}✗ ПРОВАЛЕН${this.colors.reset}`,
      'skipped': `${this.colors.yellow}○ ПРОПУЩЕН${this.colors.reset}`,
      'pending': `${this.colors.yellow}○ ОЖИДАНИЕ${this.colors.reset}`,
    };
    return statusMap[status] || status;
  }

  // Перевод заголовков
  getHeader() {
    return `${this.colors.cyan}${this.colors.bright}═══════════════════════════════════════════════════════════${this.colors.reset}\n` +
           `${this.colors.cyan}${this.colors.bright}  🧪 Запуск тестов QuickShare Backend${this.colors.reset}\n` +
           `${this.colors.cyan}${this.colors.bright}═══════════════════════════════════════════════════════════${this.colors.reset}\n`;
  }

  // Переопределяем вывод результатов
  onTestResult(test, testResult, aggregatedResults) {
    super.onTestResult(test, testResult, aggregatedResults);
    
    console.log('\n' + this.getHeader());
    
    if (testResult.testResults && testResult.testResults.length > 0) {
      testResult.testResults.forEach(result => {
        const status = this.getStatusText(result.status);
        const duration = result.duration ? ` (${result.duration}ms)` : '';
        console.log(`  ${status} ${this.colors.bright}${result.fullName}${this.colors.reset}${this.colors.gray}${duration}${this.colors.reset}`);
      });
    }
  }

  // Финальная сводка
  onRunComplete(contexts, results) {
    console.log('\n' + this.colors.cyan + this.colors.bright + '═══════════════════════════════════════════════════════════' + this.colors.reset);
    console.log(this.colors.cyan + this.colors.bright + '  📊 Итоги тестирования Backend' + this.colors.reset);
    console.log(this.colors.cyan + this.colors.bright + '═══════════════════════════════════════════════════════════' + this.colors.reset + '\n');
    
    const { numPassedTests, numFailedTests, numTotalTests, numPassedTestSuites, numFailedTestSuites, numTotalTestSuites } = results;
    
    console.log(`${this.colors.bright}Тесты:${this.colors.reset}`);
    console.log(`  ${this.colors.green}✓ Пройдено:${this.colors.reset} ${numPassedTests}`);
    if (numFailedTests > 0) {
      console.log(`  ${this.colors.red}✗ Провалено:${this.colors.reset} ${this.colors.red}${numFailedTests}${this.colors.reset}`);
    }
    console.log(`  ${this.colors.bright}Всего:${this.colors.reset} ${numTotalTests}\n`);
    
    console.log(`${this.colors.bright}Наборы тестов:${this.colors.reset}`);
    console.log(`  ${this.colors.green}✓ Пройдено:${this.colors.reset} ${numPassedTestSuites}`);
    if (numFailedTestSuites > 0) {
      console.log(`  ${this.colors.red}✗ Провалено:${this.colors.reset} ${this.colors.red}${numFailedTestSuites}${this.colors.reset}`);
    }
    console.log(`  ${this.colors.bright}Всего:${this.colors.reset} ${numTotalTestSuites}\n`);
    
    if (numFailedTests === 0) {
      console.log(this.colors.green + this.colors.bright + '🎉 Все тесты успешно пройдены!' + this.colors.reset + '\n');
    } else {
      console.log(this.colors.red + this.colors.bright + '⚠️  Есть проваленные тесты. Проверьте ошибки выше.' + this.colors.reset + '\n');
    }
  }
}

module.exports = RussianReporter;
