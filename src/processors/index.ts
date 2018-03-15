import { Path, IGet } from '../types';

export * from './jest-serializer';

export const jsonPointer = () => {
  const repeated = new WeakMap();
  return (v, path: Path) => {
    if (v !== null && typeof v === 'object') {
      if (repeated.has(v)) {
        return { $ref: makePath(repeated.get(v)) };
      }
      repeated.set(v, path);
    }
    return v;
  };

  function makePath(path: any[]): string {
    return path.map(p => {
      return typeof p === 'number' ? `[${p}]` : p;
    }).join('/');
  }  
};

export const recurseObjects = () => {
  return (v, path: Path, decend: IGet) => {
    if (v !== null && isPojo(v)) {
      return Object.keys(v).reduce((acc, key) => {
        acc[key] = decend(v[key], path.concat([key]));
        return acc;
      }, {});
    }
    return v;
  };

  function isPojo(arg: any): arg is object {
    if (arg === null || typeof arg !== 'object') {
      return false;
    }
    return Object.getPrototypeOf(arg) === Object.prototype;
  }
};

export const recurseArrays = () => {
  return (v: any, path: Path, decend: IGet) => {
    if (Array.isArray(v)) {
      return v.map((_, i) => decend(_, path.concat([i])));
    }
    return v;
  };
};

export const specialNumbers = () => {
  return v => {
    if (typeof v === 'number') {
      if (Object.is(v, -0)) return { $numberDecimal: '-0' };
      if (Number.isNaN(v)) return { $numberDecimal: 'NaN' };
      if (!Number.isFinite(v)) return { $numberDecimal: v.toString() };
    }
    return v;
  };
};

export const undefinedValue = () => {
  return v => typeof v === 'undefined' ? { $undefined: true } : v;
};

export const regexpValue = () => {
  return v => {
    if (v instanceof RegExp) {
      return {
        $regex: v.source,
        $options: v.flags
      };
    }
    return v;
  };
};

export const dateValue = () => {
  return v => {
    if (v instanceof Date) {
      return { $date: v.toISOString() };
    }
    return v;
  };
};

export const symbolValue = () => {
  return v => {
    if (typeof v === 'symbol') {
      return { $symbol: String(v).slice(7, -1)};
    }
    return v;
  };
};

export const recurseMap = () => {
  return (v: any, path: Path, decend: IGet) => {
    if (v instanceof Map) {
      return { $map: decend(Array.from(v), path) };
    }
    return v;
  };
};

export const recurseSet = () => {
  return (v: any, path: Path, decend: IGet) => {
    if (v instanceof Set) {
      return { $set: decend(Array.from(v), path) };
    }
    return v;
  };
};

export const toJSON = () => {
  return (v: any, path: Path, decend: IGet) => {
    if (v !== null && typeof v.toJSON === 'function') {
      return decend(v.toJSON(), path);
    }
    return v;
  };
};

export const bufferValue = () => {
  return (v: any) => {
    if (v instanceof Buffer) {
      return { $binary: v.toString('base64') };
    }
    return v;
  };
};