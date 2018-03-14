import { test } from 'ava';
import { 
  AJSON,
  jsonPointer,
  recurseObjects, recurseArrays, recurseMap, recurseSet,
  specialNumbers, undefinedValue, regexpValue, dateValue,
  symbolValue
} from '../dist/';

const asjon = new AJSON()
  .addProcessor(jsonPointer)
  .addProcessor(recurseObjects)
  .addProcessor(recurseArrays)
  .addProcessor(recurseMap)
  .addProcessor(recurseSet)
  .addProcessor(specialNumbers)
  .addProcessor(undefinedValue)
  .addProcessor(regexpValue)
  .addProcessor(dateValue)
  .addProcessor(symbolValue);

test('prim values', t => {
  t.deepEqual(asjon.encode(42), 42, 'number');
  t.deepEqual(asjon.encode(-42), -42, 'negative number');
  t.deepEqual(asjon.encode('woo!!!'), 'woo!!!', 'string');
  t.deepEqual(asjon.encode(true), true, 'boolean');
  t.deepEqual(asjon.encode(null), null, 'null');
});

test('special values', t => {
  t.deepEqual(asjon.encode(-0), { $numberDecimal: '-0'}, 'negative zero');
  t.deepEqual(asjon.encode(undefined), {$undefined: true}, 'undefined');
  t.deepEqual(asjon.encode(NaN), {$numberDecimal: 'NaN'}, 'NaN');
  t.deepEqual(asjon.encode(Infinity), {$numberDecimal: 'Infinity'}, 'Infinity');
  t.deepEqual(asjon.encode(-Infinity), {$numberDecimal: '-Infinity'}, 'Neg Infinity');
  t.deepEqual(asjon.encode(/regexp/img), {$regex: 'regexp', $options: 'gim'}, ' RegExp');
  t.deepEqual(asjon.encode(new Date(1e12)), {$date: '2001-09-09T01:46:40.000Z'}, 'Date');
  t.deepEqual(asjon.encode(Symbol('a')), {$symbol: 'a'}, 'Symbol');
});

test('objects', t => {
  t.deepEqual(asjon.encode(['a', 'b', 'c']), ['a', 'b', 'c'], 'Array');
  t.deepEqual(asjon.encode([]), [], 'Array (empty)');
  t.deepEqual(asjon.encode({foo: 'bar', 'x-y': 'z'}), { foo: 'bar', 'x-y': 'z'}, 'Object');
  t.deepEqual(asjon.encode(new Set([1, 2, 3])), { $set: [1, 2, 3]}, 'Set');
  t.deepEqual(asjon.encode(new Map([['a', 'b']])), { $map: [['a', 'b']]}, 'Map');
});

test('objects with special values', t => {
  t.deepEqual(asjon.encode(['a',
    new Date(1e12), 'c']),
    ['a', { $date: '2001-09-09T01:46:40.000Z'}, 'c'], 'Array');
  t.deepEqual(asjon.encode(
    { foo: 'bar', 'x-y': new Date(1e12)}),
    { foo: 'bar', 'x-y': { $date: '2001-09-09T01:46:40.000Z' }}, 'Object');
  t.deepEqual(asjon.encode(
    new Set([1, new Date(1e12), 3])),
    { $set: [1, { $date: '2001-09-09T01:46:40.000Z' }, 3]}, 'Set');
  t.deepEqual(asjon.encode(
    new Map([['a', new Date(1e12)]])), 
    { $map: [['a', { $date: '2001-09-09T01:46:40.000Z' }]]}, 'Map');
});

test('self referential', t => {
  const self: any = {};
  self.a = self;
  t.deepEqual(asjon.encode(self), { a: { $ref: '#'} }, 'object');

  const arr: any[] = [];
  arr[0] = arr;
  t.deepEqual(asjon.encode(arr), [{ $ref: '#' }], 'array');

  const map = new Map();
  map.set('self', map);
  t.deepEqual(asjon.encode(map), { $map: [['self', { $ref: '#'}]]}, 'Map');

  const set = new Set();
  set.add(set);
  set.add(42);
  t.deepEqual(asjon.encode(set), { $set: [{ $ref: '#' }, 42]}, 'Set');
});

test('deep', t => {
  const obj = {
    string: 'a_string',
    number: 42,
    decimal: 42.3,
    array: ['a_string', 42, 42.3],
    object: {
      'also a string': 'string',
      'a number': 42
    }
  };

  t.snapshot(asjon.encode(obj));
});

test('all', t => {
  const obj = {
    _id: '5aa882d3638a0f580d92c677',
    index: 0,
    name: {
      first: 'Valenzuela',
      last: 'Valenzuela'
    },
    registered: new Date(2014, 0, 1),
    symbol: Symbol('banana'),
    range: [
      -Infinity,
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      Infinity
    ],
    friends: [
      {
        id: -0,
        name: 'Benton Chase'
      },
      {
        id: 1,
        name: 'Mccarthy Morgan'
      },
      {
        id: NaN,
        name: 'Kaufman Price'
      }
    ]
  };

  obj.friends.push(<any>obj);
  obj.friends.push(obj.friends[0]);

  t.snapshot(asjon.encode(obj));
});

test('references', t => {
  const a: any = {a: 1, b: {}};
  a.c = a.b;
  t.deepEqual(asjon.encode(a), {a: 1, b: {}, c: {$ref: '#/b'}});

  const b: any = {a: 1, b: { c: {} }};
  b.c = b.b.c;
  t.deepEqual(asjon.encode(b), { a: 1, b: { c: {}}, c: { $ref: '#/b/c'}});
});
