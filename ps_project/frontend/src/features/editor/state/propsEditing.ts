export type PropsInput = Record<string, unknown> | string | null | undefined;

export type PropPathMode = "flat" | "nested";

export type PropPathOptions = {
  mode?: PropPathMode;
  removeIfEmpty?: boolean;
};

export type StringArraySelectOptions = PropPathOptions & {
  emptyValue?: string;
};

export type PropsChangeResult = {
  next: Record<string, unknown>;
  changed: boolean;
};

export type PropsUpdateResult =
  | {
      ok: true;
      props: Record<string, unknown>;
      serialized: string;
      changed: boolean;
    }
  | {
      ok: false;
      error: string;
    };

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const propsValueEqual = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
  }
  return a === b;
};

const splitPath = (path: string, mode: PropPathMode): string[] =>
  mode === "nested"
    ? path.split(".").filter((segment) => segment.length > 0)
    : [path];

const getNestedValue = (
  props: Record<string, unknown>,
  segments: string[]
): unknown => {
  let current: unknown = props;
  for (const segment of segments) {
    if (!isPlainRecord(current) || !(segment in current)) return undefined;
    current = current[segment];
  }
  return current;
};

const hasNestedKey = (props: Record<string, unknown>, segments: string[]): boolean => {
  let current: unknown = props;
  for (const segment of segments) {
    if (!isPlainRecord(current) || !(segment in current)) return false;
    current = current[segment];
  }
  return true;
};

const isEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

export const parsePropsInput = (
  input: PropsInput
):
  | { ok: true; props: Record<string, unknown> }
  | { ok: false; error: string } => {
  if (input === null || input === undefined) {
    return { ok: true, props: {} };
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return { ok: true, props: {} };
    try {
      const parsed = JSON.parse(trimmed);
      if (isPlainRecord(parsed)) {
        return { ok: true, props: parsed };
      }
      return { ok: false, error: "Props JSON must be an object." };
    } catch {
      return { ok: false, error: "Props JSON is invalid." };
    }
  }

  if (isPlainRecord(input)) {
    return { ok: true, props: input };
  }

  return { ok: false, error: "Props value must be an object or JSON string." };
};

export const serializeProps = (props: Record<string, unknown>): string =>
  JSON.stringify(props);

export const updatePropsInput = (
  input: PropsInput,
  updater: (props: Record<string, unknown>) => PropsChangeResult
): PropsUpdateResult => {
  const parsed = parsePropsInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const result = updater(parsed.props);
  if (!result.changed) {
    return {
      ok: true,
      props: parsed.props,
      serialized: serializeProps(parsed.props),
      changed: false,
    };
  }
  return {
    ok: true,
    props: result.next,
    serialized: serializeProps(result.next),
    changed: true,
  };
};

export const setPropPath = (
  props: Record<string, unknown>,
  path: string,
  value: unknown,
  options: PropPathOptions = {}
): PropsChangeResult => {
  const mode = options.mode ?? "flat";
  const segments = splitPath(path, mode);
  if (segments.length <= 1) {
    const key = segments[0];
    if (propsValueEqual(props[key], value)) {
      return { next: props, changed: false };
    }
    return { next: { ...props, [key]: value }, changed: true };
  }

  const currentValue = getNestedValue(props, segments);
  if (propsValueEqual(currentValue, value)) {
    return { next: props, changed: false };
  }

  const nextProps: Record<string, unknown> = { ...props };
  let cursor = nextProps;
  let sourceCursor: unknown = props;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const key = segments[index];
    const sourceChild =
      isPlainRecord(sourceCursor) && isPlainRecord(sourceCursor[key])
        ? (sourceCursor[key] as Record<string, unknown>)
        : undefined;
    const nextChild = sourceChild ? { ...sourceChild } : {};
    cursor[key] = nextChild;
    cursor = nextChild;
    sourceCursor = sourceChild;
  }

  cursor[segments[segments.length - 1]] = value;
  return { next: nextProps, changed: true };
};

export const unsetPropPath = (
  props: Record<string, unknown>,
  path: string,
  options: PropPathOptions = {}
): PropsChangeResult => {
  const mode = options.mode ?? "flat";
  const segments = splitPath(path, mode);
  if (segments.length <= 1) {
    const key = segments[0];
    if (!Object.prototype.hasOwnProperty.call(props, key)) {
      return { next: props, changed: false };
    }
    const next = { ...props };
    delete next[key];
    return { next, changed: true };
  }

  if (!hasNestedKey(props, segments)) {
    return { next: props, changed: false };
  }

  const nextProps: Record<string, unknown> = { ...props };
  let cursor = nextProps;
  let sourceCursor: unknown = props;
  const stack: Array<{ parent: Record<string, unknown>; key: string }> = [];

  for (let index = 0; index < segments.length - 1; index += 1) {
    const key = segments[index];
    if (!isPlainRecord(sourceCursor) || !isPlainRecord(sourceCursor[key])) {
      return { next: props, changed: false };
    }
    const nextChild = { ...(sourceCursor[key] as Record<string, unknown>) };
    cursor[key] = nextChild;
    stack.push({ parent: cursor, key });
    cursor = nextChild;
    sourceCursor = sourceCursor[key];
  }

  const leaf = segments[segments.length - 1];
  if (!Object.prototype.hasOwnProperty.call(cursor, leaf)) {
    return { next: props, changed: false };
  }

  delete cursor[leaf];

  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const { parent, key } = stack[index];
    const child = parent[key];
    if (isPlainRecord(child) && Object.keys(child).length === 0) {
      delete parent[key];
    } else {
      break;
    }
  }

  return { next: nextProps, changed: true };
};

export const applyPropUpdates = (
  props: Record<string, unknown>,
  updates: Record<string, unknown>,
  options: PropPathOptions = {}
): PropsChangeResult => {
  let next = props;
  let changed = false;

  for (const [path, value] of Object.entries(updates)) {
    const result = setPropPath(next, path, value, options);
    if (result.changed) {
      next = result.next;
      changed = true;
    }
  }

  return { next, changed };
};

export const setStringArraySelect = (
  props: Record<string, unknown>,
  path: string,
  selectedValue: string,
  options: StringArraySelectOptions = {}
): PropsChangeResult => {
  if (options.removeIfEmpty && selectedValue.trim() === "") {
    return unsetPropPath(props, path, options);
  }
  const emptyValue = options.emptyValue ?? "";
  const value = [selectedValue === "" ? emptyValue : selectedValue];
  return setPropPath(props, path, value, options);
};

export const setMultiSelect = (
  props: Record<string, unknown>,
  path: string,
  values: string[],
  options: PropPathOptions = {}
): PropsChangeResult => {
  const filtered = (values ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (options.removeIfEmpty && filtered.length === 0) {
    return unsetPropPath(props, path, options);
  }
  return setPropPath(props, path, filtered, options);
};

export const setAny = (
  props: Record<string, unknown>,
  path: string,
  value: unknown,
  options: PropPathOptions = {}
): PropsChangeResult => {
  if (options.removeIfEmpty && isEmptyValue(value)) {
    return unsetPropPath(props, path, options);
  }
  return setPropPath(props, path, value, options);
};
