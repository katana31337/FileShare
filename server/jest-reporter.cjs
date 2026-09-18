class RussianReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
  }

  onRunComplete(contexts, results) {
    const { numPassedTests, numFailedTests, numTotalTests, numPassedTestSuites, numFailedTestSuites, numTotalTestSuites } = results;

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  📊 Итоги тестирования Backend');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Тесты:');
    console.log(`  ✓ Пройдено: ${numPassedTests}`);
    if (numFailedTests > 0) {
      console.log(`  ✗ Провалено: ${numFailedTests}`);
    }
    console.log(`  Всего: ${numTotalTests}\n`);

    console.log('Наборы тестов:');
    console.log(`  ✓ Пройдено: ${numPassedTestSuites}`);
    if (numFailedTestSuites > 0) {
      console.log(`  ✗ Провалено: ${numFailedTestSuites}`);
    }
    console.log(`  Всего: ${numTotalTestSuites}\n`);

    if (numFailedTests === 0) {
      console.log('🎉 Все тесты успешно пройдены!\n');
    } else {
      console.log('⚠️  Есть проваленные тесты. Проверьте ошибки выше.\n');
    }
  }
}

module.exports = RussianReporter;
