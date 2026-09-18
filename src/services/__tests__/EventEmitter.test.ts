import { EventEmitter } from '../EventEmitter';

describe('EventEmitter', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  describe('on', () => {
    it('должен добавлять слушателя события', () => {
      const callback = jest.fn();
      emitter.on('test', callback);

      emitter.emit('test');

      expect(callback).toHaveBeenCalled();
    });

    it('должен добавлять несколько слушателей для одного события', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      emitter.on('test', callback1);
      emitter.on('test', callback2);

      emitter.emit('test');

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('должен удалять слушателя события', () => {
      const callback = jest.fn();
      emitter.on('test', callback);
      emitter.off('test', callback);

      emitter.emit('test');

      expect(callback).not.toHaveBeenCalled();
    });

    it('не должен выбрасывать ошибку если слушатель не существует', () => {
      const callback = jest.fn();

      expect(() => emitter.off('nonexistent', callback)).not.toThrow();
    });
  });

  describe('emit', () => {
    it('должен вызывать всех слушателей с аргументами', () => {
      const callback = jest.fn();
      emitter.on('test', callback);

      emitter.emit('test', 'arg1', 'arg2');

      expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('не должен выбрасывать ошибку если нет слушателей', () => {
      expect(() => emitter.emit('nonexistent')).not.toThrow();
    });

    it('должен обрабатывать ошибки в слушателях', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = jest.fn();

      emitter.on('test', errorCallback);
      emitter.on('test', normalCallback);

      expect(() => emitter.emit('test')).not.toThrow();
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('removeAllListeners', () => {
    it('должен удалять всех слушателей для конкретного события', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      emitter.on('test', callback1);
      emitter.on('test', callback2);
      emitter.removeAllListeners('test');

      emitter.emit('test');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    it('должен удалять всех слушателей для всех событий', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      emitter.on('event1', callback1);
      emitter.on('event2', callback2);
      emitter.removeAllListeners();

      emitter.emit('event1');
      emitter.emit('event2');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('интеграция', () => {
    it('должен корректно работать с множественными событиями', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      emitter.on('event1', callback1);
      emitter.on('event2', callback2);

      emitter.emit('event1', 'data1');
      emitter.emit('event2', 'data2');

      expect(callback1).toHaveBeenCalledWith('data1');
      expect(callback2).toHaveBeenCalledWith('data2');
    });

    it('должен поддерживать цепочки событий', () => {
      const results: string[] = [];

      emitter.on('start', () => {
        results.push('start');
        emitter.emit('middle');
      });

      emitter.on('middle', () => {
        results.push('middle');
        emitter.emit('end');
      });

      emitter.on('end', () => {
        results.push('end');
      });

      emitter.emit('start');

      expect(results).toEqual(['start', 'middle', 'end']);
    });
  });
});
