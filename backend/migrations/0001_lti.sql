-- LTI 1.3 option B: deployment registry, resource→course seed, learner links.

CREATE TABLE IF NOT EXISTS lti_deployments (
  iss TEXT NOT NULL,
  client_id TEXT NOT NULL,
  deployment_id TEXT NOT NULL,
  auth_login_url TEXT NOT NULL,
  jwks_url TEXT NOT NULL,
  frontend_origin TEXT NOT NULL,
  PRIMARY KEY (iss, client_id, deployment_id)
);

CREATE TABLE IF NOT EXISTS lti_resource_courses (
  iss TEXT NOT NULL,
  client_id TEXT NOT NULL,
  deployment_id TEXT NOT NULL,
  resource_link_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  PRIMARY KEY (iss, client_id, deployment_id, resource_link_id)
);

CREATE TABLE IF NOT EXISTS lti_learners (
  id TEXT PRIMARY KEY,
  iss TEXT NOT NULL,
  client_id TEXT NOT NULL,
  deployment_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_launch_at TEXT NOT NULL,
  UNIQUE (iss, client_id, deployment_id, subject)
);

CREATE TABLE IF NOT EXISTS lti_login_states (
  state TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  iss TEXT NOT NULL,
  client_id TEXT NOT NULL,
  deployment_id TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
