const { DefaultReporter } = require('@jest/reporters');

class RussianReporter extends DefaultReporter {
  constructor(globalConfig, options) {
    super(globalConfig, options);
    this.testResults = [];
    this.verbose = process.argv.includes('--full') || process.argv.includes('--verbose');
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

  onTestResult(test, testResult) {
    super.onTestResult(test, testResult);
    
    // Сохраняем результаты для итоговой сводки
    testResult.testResults.forEach(result => {
      this.testResults.push({
        fullName: result.fullName,
        status: result.status,
        duration: result.duration,
        failureMessages: result.failureMessages,
      });
    });
  }

  onRunComplete(contexts, results) {
    super.onRunComplete(contexts, results);

    // Группируем тесты по статусу
    const passed = this.testResults.filter(t => t.status === 'passed');
    const failed = this.testResults.filter(t => t.status === 'failed');
    const skipped = this.testResults.filter(t => t.status === 'skipped' || t.status === 'pending');

    if (this.verbose) {
      // РАСШИРЕННЫЙ РЕЖИМ
      this.printVerboseReport(passed, failed, skipped, results);
    } else {
      // КРАТКИЙ РЕЖИМ (по умолчанию)
      this.printBriefReport(passed, failed, skipped, results);
    }

    // Очищаем результаты для следующего запуска
    this.testResults = [];
  }

  printBriefReport(passed, failed, skipped, results) {
    console.log('\n');
    console.log(`${this.colors.cyan}${'═'.repeat(70)}${this.colors.reset}`);
    console.log(`${this.colors.cyan}${this.colors.bright}  📊 ИТОГИ ТЕСТИРОВАНИЯ${this.colors.reset}`);
    console.log(`${this.colors.cyan}${'═'.repeat(70)}${this.colors.reset}\n`);

    // Краткий список проваленных тестов
    if (failed.length > 0) {
      console.log(`${this.colors.red}${this.colors.bright}❌ ПРОВАЛЕНО (${failed.length}):${this.colors.reset}\n`);
      failed.forEach((test, index) => {
        console.log(`${this.colors.red}  ${index + 1}. ${test.fullName}${this.colors.reset}`);
      });
      console.log('');
    }

    // Краткий список пройденных тестов
    if (passed.length > 0) {
      console.log(`${this.colors.green}${this.colors.bright}✅ ПРОЙДЕНО (${passed.length})${this.colors.reset}\n`);
    }

    // Статистика
    console.log(`${this.colors.cyan}${'─'.repeat(70)}${this.colors.reset}`);
    console.log(`${this.colors.bright}📈 СТАТИСТИКА:${this.colors.reset}\n`);
    
    console.log(`  ${this.colors.green}✓ Пройдено:${this.colors.reset}  ${this.colors.green}${this.colors.bright}${passed.length}${this.colors.reset}`);
    
    if (failed.length > 0) {
      console.log(`  ${this.colors.red}✗ Провалено:${this.colors.reset} ${this.colors.red}${this.colors.bright}${failed.length}${this.colors.reset}`);
    } else {
      console.log(`  ${this.colors.gray}✗ Провалено:${this.colors.reset} ${this.colors.gray}0${this.colors.reset}`);
    }
    
    if (skipped.length > 0) {
      console.log(`  ${this.colors.yellow}⏭ Пропущено:${this.colors.reset} ${this.colors.yellow}${this.colors.bright}${skipped.length}${this.colors.reset}`);
    }
    
    console.log(`  ${this.colors.bright}Σ Всего:${this.colors.reset}      ${this.colors.bright}${this.testResults.length}${this.colors.reset}`);
    
    const totalTime = results.testResults.reduce((sum, test) => sum + test.perfStats.end - test.perfStats.start, 0);
    console.log(`  ${this.colors.cyan}⏱ Время:${this.colors.reset}        ${this.colors.cyan}${this.colors.bright}${(totalTime / 1000).toFixed(2)}s${this.colors.reset}\n`);

    // Финальное сообщение
    console.log(`${this.colors.cyan}${'═'.repeat(70)}${this.colors.reset}`);
    
    if (failed.length === 0) {
      console.log(`\n  ${this.colors.green}${this.colors.bright}🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! 🎉${this.colors.reset}\n`);
    } else {
      console.log(`\n  ${this.colors.red}${this.colors.bright}⚠️  ЕСТЬ ПРОВАЛЕННЫЕ ТЕСТЫ${this.colors.reset}`);
      console.log(`  ${this.colors.gray}💡 Используйте 'npm test -- --full' для детального вывода${this.colors.reset}\n`);
    }
    
    console.log(`${this.colors.cyan}${'═'.repeat(70)}${this.colors.reset}\n`);
  }

  printVerboseReport(passed, failed, skipped, results) {
    console.log('\n');
    console.log(`${this.colors.cyan}${'═'.repeat(70)}${this.colors.reset}`);
    console.log(`${this.colors.cyan}${this.colors.bright}  📊 ИТОГИ ТЕСТИРОВАНИЯ (ПОДРОБНО)${this.colors.reset}`);
    console.log(`${this.colors.cyan}${'═'.repeat(70)}${this.colors.reset}\n`);

    // Подробный список проваленных тестов
    if (failed.length > 0) {
      console.log(`${this.colors.red}${this.colors.bright}❌ ПРОВАЛЕННЫЕ ТЕСТЫ (${failed.length}):${this.colors.reset}`);
      console.log(`${this.colors.red}${'─'.repeat(70)}${this.colors.reset}\n`);
      
      failed.forEach((test, index) => {
        console.log(`${this.colors.red}  ${index + 1}. ${test.fullName}${this.colors.reset}`);
        console.log(`${this.colors.gray}     Время: ${test.duration}ms${this.colors.reset}`);
        
        if (test.failureMessages && test.failureMessages.length > 0) {
          console.log(`${this.colors.red}     Ошибка:${this.colors.reset}`);
          test.failureMessages.forEach(msg => {
            const lines = msg.split('\n').slice(0, 10); // Показываем больше строк в подробном режиме
            lines.forEach(line => {
              console.log(`${this.colors.red}       ${line}${this.colors.reset}`);
            });
          });
        }
        console.log('');
      });
    }

    // Подробный список пройденных тестов
    if (passed.length > 0) {
      console.log(`${this.colors.green}${this.colors.bright}✅ ПРОЙДЕННЫЕ ТЕСТЫ (${passed.length}):${this.colors.reset}`);
      console.log(`${this.colors.green}${'─'.repeat(70)}${this.colors.reset}\n`);
      
      passed.forEach((test, index) => {
        console.log(`${this.colors.green}  ${index + 1}. ${test.fullName}${this.colors.reset} ${this.colors.gray}(${test.duration}ms)${this.colors.reset}`);
      });
      console.log('');
    }

    // Пропущенные тесты
    if (skipped.length > 0) {
      console.log(`${this.colors.yellow}${this.colors.bright}⏭️  ПРОПУЩЕННЫЕ ТЕСТЫ (${skipped.length}):${this.colors.reset}`);
      console.log(`${this.colors.yellow}${'─'.repeat(70)}${this.colors.reset}\n`);
      
      skipped.forEach((test, index) => {
        console.log(`${this.colors.yellow}  ${index + 1}. ${test.fullName}${this.colors.reset}`);
      });
      console.log('');
    }

    // Статистика
    console.log(`${this.colors.cyan}${'═'.repeat(70)}${this.colors.reset}`);
    console.log(`${this.colors.bright}📈 СТАТИСТИКА:${this.colors.reset}`);
    console.log(`${this.colors.cyan}${'─'.repeat(70)}${this.colors.reset}\n`);
    
    console.log(`  ${this.colors.green}✓ Пройдено:${this.colors.reset}      ${this.colors.green}${this.colors.bright}${passed.length}${this.colors.reset}`);
    
    if (failed.length > 0) {
      console.log(`  ${this.colors.red}✗ Провалено:${this.colors.reset}     ${this.colors.red}${this.colors.bright}${failed.length}${this.colors.reset}`);
    } else {
      console.log(`  ${this.colors.gray}✗ Провалено:${this.colors.reset}     ${this.colors.gray}0${this.colors.reset}`);
    }
    
    if (skipped.length > 0) {
      console.log(`  ${this.colors.yellow}⏭  Пропущено:${this.colors.reset}     ${this.colors.yellow}${this.colors.bright}${skipped.length}${this.colors.reset}`);
    }
    
    console.log(`  ${this.colors.bright}Σ Всего:${this.colors.reset}         ${this.colors.bright}${this.testResults.length}${this.colors.reset}`);
    console.log('');

    const totalTime = results.testResults.reduce((sum, test) => sum + test.perfStats.end - test.perfStats.start, 0);
    console.log(`  ${this.colors.cyan}⏱  Время выполнения:${this.colors.reset} ${this.colors.cyan}${this.colors.bright}${(totalTime / 1000).toFixed(2)}s${this.colors.reset}`);
    console.log('');

    // Финальное сообщение
    console.log(`${this.colors.cyan}${'═'.repeat(70)}${this.colors.reset}`);
    
    if (failed.length === 0) {
      console.log(`\n  ${this.colors.green}${this.colors.bright}🎉 ВСЕ ТЕСТЫ УСПЕШНО ПРОЙДЕНЫ! 🎉${this.colors.reset}\n`);
    } else {
      console.log(`\n  ${this.colors.red}${this.colors.bright}⚠️  ЕСТЬ ПРОВАЛЕННЫЕ ТЕСТЫ - ПРОВЕРЬТЕ ВЫШЕ${this.colors.reset}\n`);
    }
    
    console.log(`${this.colors.cyan}${'═'.repeat(70)}${this.colors.reset}\n`);
  }
}

module.exports = RussianReporter;
