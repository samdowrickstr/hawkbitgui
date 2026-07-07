import crypto from 'crypto';
import path from 'path';
import { promises as fs } from 'fs';
import { GuiRole, isGuiRole, permissionsForGuiRole } from '@/utils/gui-roles';

const PASSWORD_ITERATIONS = 310000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = 'sha256';
const MAX_AUDIT_EVENTS = 1000;
const BUILT_IN_ADMIN_USERNAME = 'admin';

export type StoredGuiUser = {
  id: string;
  username: string;
  role: GuiRole;
  enabled: boolean;
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
};

export type PublicGuiUser = Omit<StoredGuiUser, 'passwordHash' | 'passwordSalt' | 'passwordIterations'> & {
  permissions: string[];
  protected: boolean;
};

export type AuditEvent = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  subject: string;
  details?: Record<string, unknown>;
};

type GuiUserStore = {
  version: 1;
  users: StoredGuiUser[];
  audit: AuditEvent[];
};

type CreateUserInput = {
  username: string;
  password: string;
  role: GuiRole;
  enabled: boolean;
  actor: string;
};

type UpdateUserInput = {
  id: string;
  username?: string;
  password?: string;
  role?: GuiRole;
  enabled?: boolean;
  actor: string;
};

const getUsersFilePath = () => {
  return process.env.HAWKBITGUI_USERS_FILE ?? path.join(process.cwd(), 'data', 'users.json');
};

const getDefaultPassword = (envName: string, fallback: string) => {
  return process.env[envName] ?? fallback;
};

const now = () => new Date().toISOString();

const normaliseUsername = (username: string) => username.trim().toLowerCase();

const isBuiltInAdmin = (user: Pick<StoredGuiUser, 'username'>) => user.username === BUILT_IN_ADMIN_USERNAME;

const hashPassword = (password: string, salt = crypto.randomBytes(16).toString('hex'), iterations = PASSWORD_ITERATIONS) => {
  const hash = crypto.pbkdf2Sync(password, salt, iterations, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST).toString('hex');
  return { hash, salt, iterations };
};

const verifyPassword = (password: string, user: StoredGuiUser) => {
  const { hash } = hashPassword(password, user.passwordSalt, user.passwordIterations);
  const expected = Buffer.from(user.passwordHash, 'hex');
  const actual = Buffer.from(hash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

const publicUser = (user: StoredGuiUser): PublicGuiUser => ({
  id: user.id,
  username: user.username,
  role: user.role,
  enabled: user.enabled,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  createdBy: user.createdBy,
  updatedBy: user.updatedBy,
  permissions: permissionsForGuiRole(user.role),
  protected: isBuiltInAdmin(user),
});

const createSeedUser = (username: string, password: string, role: GuiRole): StoredGuiUser => {
  const timestamp = now();
  const { hash, salt, iterations } = hashPassword(password);
  return {
    id: crypto.randomUUID(),
    username,
    role,
    enabled: true,
    passwordHash: hash,
    passwordSalt: salt,
    passwordIterations: iterations,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: 'system',
    updatedBy: 'system',
  };
};

const initialStore = (): GuiUserStore => ({
  version: 1,
  users: [
    createSeedUser(BUILT_IN_ADMIN_USERNAME, getDefaultPassword('HAWKBITGUI_ADMIN_PASSWORD', 'str-admin-change-me'), 'admin'),
    createSeedUser('operator', getDefaultPassword('HAWKBITGUI_OPERATOR_PASSWORD', 'operator-change-me'), 'operator'),
    createSeedUser('approver', getDefaultPassword('HAWKBITGUI_APPROVER_PASSWORD', 'approver-change-me'), 'approver'),
    createSeedUser('viewer', getDefaultPassword('HAWKBITGUI_VIEWER_PASSWORD', 'viewer-change-me'), 'viewer'),
  ],
  audit: [
    {
      id: crypto.randomUUID(),
      timestamp: now(),
      actor: 'system',
      action: 'seed-users',
      subject: 'gui-users',
    },
  ],
});

const readStore = async (): Promise<GuiUserStore> => {
  const filePath = getUsersFilePath();
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as GuiUserStore;
    return {
      version: 1,
      users: parsed.users.filter((user) => isGuiRole(user.role)),
      audit: parsed.audit ?? [],
    };
  } catch (error) {
    const store = initialStore();
    await writeStore(store);
    return store;
  }
};

const writeStore = async (store: GuiUserStore) => {
  const filePath = getUsersFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  await fs.rename(tmpPath, filePath);
};

const appendAudit = (store: GuiUserStore, event: Omit<AuditEvent, 'id' | 'timestamp'>) => {
  store.audit = [
    {
      id: crypto.randomUUID(),
      timestamp: now(),
      ...event,
    },
    ...(store.audit ?? []),
  ].slice(0, MAX_AUDIT_EVENTS);
};

export async function listGuiUsers() {
  const store = await readStore();
  return store.users.map(publicUser);
}

export async function listAuditEvents(limit = 100) {
  const store = await readStore();
  return (store.audit ?? []).slice(0, limit);
}

export async function findGuiUserByUsername(username: string) {
  const store = await readStore();
  const normalised = normaliseUsername(username);
  const user = store.users.find((candidate) => candidate.username === normalised);
  return user ? publicUser(user) : null;
}

export async function authenticateGuiUser(username: string, password: string) {
  const store = await readStore();
  const normalised = normaliseUsername(username);
  const user = store.users.find((candidate) => candidate.username === normalised);

  if (!user || !user.enabled || !verifyPassword(password, user)) {
    return null;
  }

  appendAudit(store, {
    actor: user.username,
    action: 'login',
    subject: user.username,
  });
  await writeStore(store);

  return publicUser(user);
}

export async function getGuiUserById(id: string) {
  const store = await readStore();
  const user = store.users.find((candidate) => candidate.id === id);
  return user ? publicUser(user) : null;
}

export async function createGuiUser(input: CreateUserInput) {
  const store = await readStore();
  const username = normaliseUsername(input.username);

  if (!username) {
    throw new Error('Username is required');
  }
  if (input.password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  if (store.users.some((user) => user.username === username)) {
    throw new Error('Username already exists');
  }

  const timestamp = now();
  const { hash, salt, iterations } = hashPassword(input.password);
  const user: StoredGuiUser = {
    id: crypto.randomUUID(),
    username,
    role: input.role,
    enabled: input.enabled,
    passwordHash: hash,
    passwordSalt: salt,
    passwordIterations: iterations,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: input.actor,
    updatedBy: input.actor,
  };

  store.users.push(user);
  appendAudit(store, {
    actor: input.actor,
    action: 'create-user',
    subject: username,
    details: { role: input.role, enabled: input.enabled },
  });
  await writeStore(store);
  return publicUser(user);
}

export async function updateGuiUser(input: UpdateUserInput) {
  const store = await readStore();
  const user = store.users.find((candidate) => candidate.id === input.id);

  if (!user) {
    throw new Error('User not found');
  }

  const protectedAdmin = isBuiltInAdmin(user);

  if (input.username !== undefined) {
    const username = normaliseUsername(input.username);
    if (!username) {
      throw new Error('Username is required');
    }
    if (protectedAdmin && username !== BUILT_IN_ADMIN_USERNAME) {
      throw new Error('The built-in admin username cannot be changed');
    }
    if (store.users.some((candidate) => candidate.id !== input.id && candidate.username === username)) {
      throw new Error('Username already exists');
    }
    user.username = username;
  }

  if (input.role !== undefined) {
    if (protectedAdmin && input.role !== 'admin') {
      throw new Error('The built-in admin role cannot be changed');
    }
    user.role = input.role;
  }

  if (input.enabled !== undefined) {
    if (protectedAdmin && !input.enabled) {
      throw new Error('The built-in admin user cannot be disabled');
    }
    user.enabled = input.enabled;
  }

  if (input.password !== undefined && input.password !== '') {
    if (input.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    const { hash, salt, iterations } = hashPassword(input.password);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    user.passwordIterations = iterations;
  }

  user.updatedAt = now();
  user.updatedBy = input.actor;

  appendAudit(store, {
    actor: input.actor,
    action: 'update-user',
    subject: user.username,
    details: {
      role: user.role,
      enabled: user.enabled,
      passwordChanged: input.password !== undefined && input.password !== '',
    },
  });
  await writeStore(store);
  return publicUser(user);
}

export async function deleteGuiUser(id: string, actor: string) {
  const store = await readStore();
  const user = store.users.find((candidate) => candidate.id === id);

  if (!user) {
    throw new Error('User not found');
  }
  if (isBuiltInAdmin(user)) {
    throw new Error('The built-in admin user cannot be deleted');
  }
  if (user.username === actor) {
    throw new Error('You cannot delete your own user while logged in');
  }

  store.users = store.users.filter((candidate) => candidate.id !== id);
  appendAudit(store, {
    actor,
    action: 'delete-user',
    subject: user.username,
  });
  await writeStore(store);
}

export async function recordAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>) {
  const store = await readStore();
  appendAudit(store, event);
  await writeStore(store);
}
