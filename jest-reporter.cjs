class RussianReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
    this.testSuites = new Map();
  }

  // Цвета для терминала
  get colors() {
    return {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      dim: '\x1b[2m',
      green: '\x1b[32m',
      red: '\x1b[31m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      gray: '\x1b[90m',
    };
  }

  onRunStart(results, options) {
    // Пустой метод - ничего не выводим в начале
  }

  onTestResult(test, testResult, aggregatedResults) {
    // Группируем результаты по тестовым наборам
    const testPath = testResult.testFilePath;
    const suiteName = this.getShortName(testPath);
    
    this.testSuites.set(testPath, {
      name: suiteName,
      results: testResult.testResults,
      status: testResult.status,
      duration: testResult.perfStats.end - testResult.perfStats.start,
    });
  }

  getShortName(fullPath) {
    const parts = fullPath.split('/');
    const testFile = parts[parts.length - 1];
    const dir = parts[parts.length - 3] || parts[parts.length - 2];
    return `${dir}/${testFile}`;
  }

  onRunComplete(contexts, results) {
    const allTests = [];
    this.testSuites.forEach((suite) => {
      suite.results.forEach(test => {
        allTests.push({
          ...test,
          suiteName: suite.name,
        });
      });
    });

    const passed = allTests.filter(t => t.status === 'passed');
    const failed = allTests.filter(t => t.status === 'failed');
    const skipped = allTests.filter(t => t.status === 'skipped' || t.status === 'pending');

    const c = this.colors;

    console.log('\n');
    console.log(`${c.cyan}${'═'.repeat(70)}${c.reset}`);
    console.log(`${c.cyan}${c.bright}  📊 ИТОГИ ТЕСТИРОВАНИЯ FRONTEND${c.reset}`);
    console.log(`${c.cyan}${'═'.repeat(70)}${c.reset}\n`);

    // Пройденные тесты
    if (passed.length > 0) {
      console.log(`${c.green}${c.bright}✅ ПРОЙДЕННЫЕ ТЕСТЫ (${passed.length}):${c.reset}`);
      console.log(`${c.green}${'─'.repeat(70)}${c.reset}\n`);
      
      const grouped = this.groupBySuite(passed);
      grouped.forEach((tests, suiteName) => {
        console.log(`${c.green}${c.bright}  📁 ${suiteName}${c.reset}`);
        tests.forEach((test) => {
          const duration = test.duration ? ` (${test.duration}ms)` : '';
          console.log(`${c.green}    ✓ ${test.fullName}${c.reset}${c.gray}${duration}${c.reset}`);
        });
        console.log('');
      });
    }

    // Проваленные тесты
    if (failed.length > 0) {
      console.log(`${c.red}${c.bright}❌ ПРОВАЛЕННЫЕ ТЕСТЫ (${failed.length}):${c.reset}`);
      console.log(`${c.red}${'─'.repeat(70)}${c.reset}\n`);
      
      const grouped = this.groupBySuite(failed);
      grouped.forEach((tests, suiteName) => {
        console.log(`${c.red}${c.bright}  📁 ${suiteName}${c.reset}`);
        tests.forEach((test) => {
          const duration = test.duration ? ` (${test.duration}ms)` : '';
          console.log(`${c.red}    ✗ ${test.fullName}${c.reset}${c.gray}${duration}${c.reset}`);
          
          if (test.failureMessages && test.failureMessages.length > 0) {
            console.log(`${c.red}       Ошибка:${c.reset}`);
            test.failureMessages.forEach(msg => {
              const lines = msg.split('\n').slice(0, 5);
              lines.forEach(line => {
                console.log(`${c.red}         ${line}${c.reset}`);
              });
            });
          }
          console.log('');
        });
      });
    }

    // Пропущенные тесты
    if (skipped.length > 0) {
      console.log(`${c.yellow}${c.bright}⏭️  ПРОПУЩЕННЫЕ ТЕСТЫ (${skipped.length}):${c.reset}`);
      console.log(`${c.yellow}${'─'.repeat(70)}${c.reset}\n`);
      
      const grouped = this.groupBySuite(skipped);
      grouped.forEach((tests, suiteName) => {
        console.log(`${c.yellow}${c.bright}  📁 ${suiteName}${c.reset}`);
        tests.forEach((test) => {
          console.log(`${c.yellow}    ⏭ ${test.fullName}${c.reset}`);
        });
        console.log('');
      });
    }

    // Статистика
    console.log(`${c.cyan}${'═'.repeat(70)}${c.reset}`);
    console.log(`${c.bright}📈 СТАТИСТИКА:${c.reset}`);
    console.log(`${c.cyan}${'─'.repeat(70)}${c.reset}\n`);
    
    console.log(`  ${c.green}✓ Пройдено:${c.reset}      ${c.green}${c.bright}${passed.length}${c.reset}`);
    
    if (failed.length > 0) {
      console.log(`  ${c.red}✗ Провалено:${c.reset}     ${c.red}${c.bright}${failed.length}${c.reset}`);
    } else {
      console.log(`  ${c.gray}✗ Провалено:${c.reset}     ${c.gray}0${c.reset}`);
    }
    
    if (skipped.length > 0) {
      console.log(`  ${c.yellow}⏭  Пропущено:${c.reset}     ${c.yellow}${c.bright}${skipped.length}${c.reset}`);
    }
    
    console.log(`  ${c.bright}Σ Всего:${c.reset}         ${c.bright}${allTests.length}${c.reset}`);
    console.log('');

    const totalTime = results.testResults.reduce((sum, test) => sum + test.perfStats.end - test.perfStats.start, 0);
    console.log(`  ${c.cyan}⏱  Время выполнения:${c.reset} ${c.cyan}${c.bright}${(totalTime / 1000).toFixed(2)}s${c.reset}`);
    console.log('');

    // Финальное сообщение
    console.log(`${c.cyan}${'═'.repeat(70)}${c.reset}`);
    
    if (failed.length === 0) {
      console.log(`\n  ${c.green}${c.bright}🎉 ВСЕ ТЕСТЫ FRONTEND УСПЕШНО ПРОЙДЕНЫ! 🎉${c.reset}\n`);
    } else {
      console.log(`\n  ${c.red}${c.bright}⚠️  ЕСТЬ ПРОВАЛЕННЫЕ ТЕСТЫ - ПРОВЕРЬТЕ ВЫШЕ${c.reset}\n`);
    }
    
    console.log(`${c.cyan}${'═'.repeat(70)}${c.reset}\n`);

    // Очищаем результаты для следующего запуска
    this.testSuites.clear();
  }

  groupBySuite(tests) {
    const grouped = new Map();
    tests.forEach(test => {
      const suiteName = test.suiteName;
      if (!grouped.has(suiteName)) {
        grouped.set(suiteName, []);
      }
      grouped.get(suiteName).push(test);
    });
    return grouped;
  }

  getLastError() {
    return undefined;
  }
}

module.exports = RussianReporter;
