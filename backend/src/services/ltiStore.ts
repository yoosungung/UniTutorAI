export type LtiDeployment = {
  iss: string;
  clientId: string;
  deploymentId: string;
  authLoginUrl: string;
  jwksUrl: string;
  frontendOrigin: string;
};

export type LtiResourceCourse = {
  iss: string;
  clientId: string;
  deploymentId: string;
  resourceLinkId: string;
  courseId: string;
};

export type LtiLearner = {
  id: string;
  iss: string;
  clientId: string;
  deploymentId: string;
  subject: string;
  createdAt: string;
  lastLaunchAt: string;
};

export type LtiLoginState = {
  nonce: string;
  iss: string;
  clientId: string;
  deploymentId: string;
};

export type LtiIdTokenClaims = {
  iss: string;
  aud: string;
  sub: string;
  nonce: string;
  deploymentId: string;
  messageType: string;
  version: string;
  resourceLinkId: string;
};

export type LtiStore = {
  getDeployment(
    iss: string,
    clientId: string,
    deploymentId: string,
  ): Promise<LtiDeployment | null>;
  getCourseId(
    iss: string,
    clientId: string,
    deploymentId: string,
    resourceLinkId: string,
  ): Promise<string | null>;
  putLoginState(state: LtiLoginState): Promise<string>;
  consumeLoginState(state: string): Promise<LtiLoginState | null>;
  upsertLearner(input: {
    iss: string;
    clientId: string;
    deploymentId: string;
    subject: string;
  }): Promise<LtiLearner>;
};

function deploymentKey(
  iss: string,
  clientId: string,
  deploymentId: string,
): string {
  return `${iss}\0${clientId}\0${deploymentId}`;
}

function resourceKey(
  iss: string,
  clientId: string,
  deploymentId: string,
  resourceLinkId: string,
): string {
  return `${deploymentKey(iss, clientId, deploymentId)}\0${resourceLinkId}`;
}

function learnerKey(
  iss: string,
  clientId: string,
  deploymentId: string,
  subject: string,
): string {
  return `${deploymentKey(iss, clientId, deploymentId)}\0${subject}`;
}

function randomId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** In-memory store for unit tests / local spike without D1. */
export class MemoryLtiStore implements LtiStore {
  private deployments = new Map<string, LtiDeployment>();
  private resources = new Map<string, string>();
  private learners = new Map<string, LtiLearner>();
  private learnersById = new Map<string, LtiLearner>();
  private loginStates = new Map<
    string,
    LtiLoginState & { expiresAt: number }
  >();

  seedDeployment(d: LtiDeployment): void {
    this.deployments.set(
      deploymentKey(d.iss, d.clientId, d.deploymentId),
      d,
    );
  }

  seedResourceCourse(r: LtiResourceCourse): void {
    this.resources.set(
      resourceKey(r.iss, r.clientId, r.deploymentId, r.resourceLinkId),
      r.courseId,
    );
  }

  getLearnerById(id: string): LtiLearner | undefined {
    return this.learnersById.get(id);
  }

  listLearners(): LtiLearner[] {
    return [...this.learnersById.values()];
  }

  async getDeployment(
    iss: string,
    clientId: string,
    deploymentId: string,
  ): Promise<LtiDeployment | null> {
    return this.deployments.get(deploymentKey(iss, clientId, deploymentId)) ?? null;
  }

  async getCourseId(
    iss: string,
    clientId: string,
    deploymentId: string,
    resourceLinkId: string,
  ): Promise<string | null> {
    return (
      this.resources.get(
        resourceKey(iss, clientId, deploymentId, resourceLinkId),
      ) ?? null
    );
  }

  async putLoginState(state: LtiLoginState): Promise<string> {
    return this.putLoginStateSync(state);
  }

  /** Sync helper for tests that seed state before POST /lti/launch. */
  putLoginStateSync(state: LtiLoginState): string {
    const id = randomId('state');
    this.loginStates.set(id, {
      ...state,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    return id;
  }

  async consumeLoginState(state: string): Promise<LtiLoginState | null> {
    const row = this.loginStates.get(state);
    if (!row) return null;
    this.loginStates.delete(state);
    if (row.expiresAt < Date.now()) return null;
    return {
      nonce: row.nonce,
      iss: row.iss,
      clientId: row.clientId,
      deploymentId: row.deploymentId,
    };
  }

  async upsertLearner(input: {
    iss: string;
    clientId: string;
    deploymentId: string;
    subject: string;
  }): Promise<LtiLearner> {
    const key = learnerKey(
      input.iss,
      input.clientId,
      input.deploymentId,
      input.subject,
    );
    const now = new Date().toISOString();
    const existing = this.learners.get(key);
    if (existing) {
      const updated = { ...existing, lastLaunchAt: now };
      this.learners.set(key, updated);
      this.learnersById.set(updated.id, updated);
      return updated;
    }
    const created: LtiLearner = {
      id: randomId('lti-learner'),
      iss: input.iss,
      clientId: input.clientId,
      deploymentId: input.deploymentId,
      subject: input.subject,
      createdAt: now,
      lastLaunchAt: now,
    };
    this.learners.set(key, created);
    this.learnersById.set(created.id, created);
    return created;
  }
}

type D1Like = {
  prepare(query: string): {
    bind(
      ...values: unknown[]
    ): {
      first<T = Record<string, unknown>>(): Promise<T | null>;
      run(): Promise<unknown>;
    };
  };
};

/** D1-backed store for Workers deploy. */
export class D1LtiStore implements LtiStore {
  constructor(private readonly db: D1Like) {}

  async getDeployment(
    iss: string,
    clientId: string,
    deploymentId: string,
  ): Promise<LtiDeployment | null> {
    const row = await this.db
      .prepare(
        `SELECT iss, client_id, deployment_id, auth_login_url, jwks_url, frontend_origin
         FROM lti_deployments
         WHERE iss = ? AND client_id = ? AND deployment_id = ?`,
      )
      .bind(iss, clientId, deploymentId)
      .first<{
        iss: string;
        client_id: string;
        deployment_id: string;
        auth_login_url: string;
        jwks_url: string;
        frontend_origin: string;
      }>();
    if (!row) return null;
    return {
      iss: row.iss,
      clientId: row.client_id,
      deploymentId: row.deployment_id,
      authLoginUrl: row.auth_login_url,
      jwksUrl: row.jwks_url,
      frontendOrigin: row.frontend_origin,
    };
  }

  async getCourseId(
    iss: string,
    clientId: string,
    deploymentId: string,
    resourceLinkId: string,
  ): Promise<string | null> {
    const row = await this.db
      .prepare(
        `SELECT course_id FROM lti_resource_courses
         WHERE iss = ? AND client_id = ? AND deployment_id = ? AND resource_link_id = ?`,
      )
      .bind(iss, clientId, deploymentId, resourceLinkId)
      .first<{ course_id: string }>();
    return row?.course_id ?? null;
  }

  async putLoginState(state: LtiLoginState): Promise<string> {
    const id = randomId('state');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await this.db
      .prepare(
        `INSERT INTO lti_login_states (state, nonce, iss, client_id, deployment_id, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        state.nonce,
        state.iss,
        state.clientId,
        state.deploymentId,
        expiresAt,
      )
      .run();
    return id;
  }

  async consumeLoginState(state: string): Promise<LtiLoginState | null> {
    const row = await this.db
      .prepare(
        `SELECT nonce, iss, client_id, deployment_id, expires_at
         FROM lti_login_states WHERE state = ?`,
      )
      .bind(state)
      .first<{
        nonce: string;
        iss: string;
        client_id: string;
        deployment_id: string;
        expires_at: string;
      }>();
    if (!row) return null;
    await this.db
      .prepare(`DELETE FROM lti_login_states WHERE state = ?`)
      .bind(state)
      .run();
    if (new Date(row.expires_at).getTime() < Date.now()) return null;
    return {
      nonce: row.nonce,
      iss: row.iss,
      clientId: row.client_id,
      deploymentId: row.deployment_id,
    };
  }

  async upsertLearner(input: {
    iss: string;
    clientId: string;
    deploymentId: string;
    subject: string;
  }): Promise<LtiLearner> {
    const existing = await this.db
      .prepare(
        `SELECT id, iss, client_id, deployment_id, subject, created_at, last_launch_at
         FROM lti_learners
         WHERE iss = ? AND client_id = ? AND deployment_id = ? AND subject = ?`,
      )
      .bind(input.iss, input.clientId, input.deploymentId, input.subject)
      .first<{
        id: string;
        iss: string;
        client_id: string;
        deployment_id: string;
        subject: string;
        created_at: string;
        last_launch_at: string;
      }>();
    const now = new Date().toISOString();
    if (existing) {
      await this.db
        .prepare(`UPDATE lti_learners SET last_launch_at = ? WHERE id = ?`)
        .bind(now, existing.id)
        .run();
      return {
        id: existing.id,
        iss: existing.iss,
        clientId: existing.client_id,
        deploymentId: existing.deployment_id,
        subject: existing.subject,
        createdAt: existing.created_at,
        lastLaunchAt: now,
      };
    }
    const id = randomId('lti-learner');
    await this.db
      .prepare(
        `INSERT INTO lti_learners (id, iss, client_id, deployment_id, subject, created_at, last_launch_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.iss,
        input.clientId,
        input.deploymentId,
        input.subject,
        now,
        now,
      )
      .run();
    return {
      id,
      iss: input.iss,
      clientId: input.clientId,
      deploymentId: input.deploymentId,
      subject: input.subject,
      createdAt: now,
      lastLaunchAt: now,
    };
  }
}
