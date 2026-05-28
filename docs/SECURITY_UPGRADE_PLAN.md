# Security Vulnerability Upgrade Plan

## Summary
170 open security alerts detected (1 critical, 28 high, 102 medium, 39 low)

### Critical (1)
1. **protobufjs** - Arbitrary code execution
2. **github.com/jackc/pgx/v5** - PostgreSQL driver
3. **basic-ftp** - FTP client

### High Priority (28)
- **axios** (15 alerts): Prototype pollution, SSRF, command injection
- **multer** (7 alerts): File upload vulnerabilities
- **lodash** (3 alerts): Template injection, prototype pollution
- **protobufjs** (4 alerts): Code injection, DoS
- **undici** (3 alerts): Header injection, SSRF
- **picomatch** (3 alerts): ReDoS, prototype pollution
- **basic-ftp** (3 alerts): SSRF, path traversal
- **sequelize** (1): SQL injection potential
- **sequelize-typescript** (1): SQL injection
- **langchain** (1): Prompt injection
- **@langchain/core** (1): Prompt injection
- **jsonwebtoken** (1): Key confusion
- **socket.io-parser** (2): Prototype pollution
- **protobufjs-cli** (2): Code injection
- **path-to-regexp** (2): ReDoS
- **lodash-es** (2): Prototype pollution
- **flatted** (2): Prototype pollution
- **fast-uri** (2): SSRF
- **ws** (2): Uninitialized memory disclosure
- **underscore** (2): Prototype pollution
- **rollup** (1): Prototype pollution
- **music-metadata** (1): Regular expression DoS
- **js-cookie** (1): Prototype pollution
- **dicer** (1): Buffer overflow
- **braces** (1): ReDoS
- **langsmith** (1): Information disclosure

## Upgrade Strategy

### Phase 1: Immediate Critical Fixes
**Priority**: Same-day deployment

#### 1.1 Frontend (`frontend/package.json`)
```json
{
  "dependencies": {
    "axios": "^1.7.9", // Upgrade from 1.6.0
    "react-toastify": "^9.1.3" // Already latest
  }
}
```

#### 1.2 Go Dependencies (`business/go.mod`)
```go
// Add to go.mod:
replace github.com/jackc/pgx/v5 => github.com/jackc/pgx/v5/v5.15.1
replace github.com/protobufjs/protobufjs => github.com/protobufjs/protobufjs/v6.11.6

// Update existing:
google.golang.org/protobuf => v1.34.2
```

#### 1.3 Legacy Backend (`legacy/backend/package.json`)
```json
{
  "dependencies": {
    "axios": "^1.7.9", // From 1.13.2
    "multer": "^1.4.5-lts.1", // From 1.4.2
    "sequelize": "^6.37.3", // From 5.22.3
    "jsonwebtoken": "^9.0.2", // From 8.5.1
    "socket.io": "^4.7.5", // From 3.0.5
    "uuid": "^9.0.1", // From 8.3.2
    "express": "^4.19.2" // From 4.17.1
  },
  "devDependencies": {
    "@types/node": "^20.16.13", // From 20.0.0
    "typescript": "^5.5.4" // From 5.3.3
  }
}
```

#### 1.4 Marketplace Hub (`marketplace-hub/package.json`)
```json
{
  "dependencies": {
    "axios": "^1.7.9" // From 1.7.9 (already latest)
  }
}
```

### Phase 2: High Priority Fixes
**Priority**: 1-2 days

#### 2.1 Frontend Additional Updates
```json
{
  "devDependencies": {
    "vite": "^5.3.7", // From 4.5.1
    "eslint": "^8.57.0", // From 8.55.0
    "@vitejs/plugin-react": "^4.3.1" // From 4.2.0
  }
}
```

#### 2.2 Legacy Backend Additional
```json
{
  "dependencies": {
    "puppeteer": "^23.6.1", // From 24.34.0
    "bcryptjs": "^2.4.3", // Already latest
    "pg": "^8.12.0", // From 8.4.1
    "socket.io-client": "^4.7.5", // From 3.0.5
    "amqplib": "^0.10.5", // From 0.10.9
    "cheerio": "^1.0.0-rc.12", // From 1.1.2
    "sharp": "^0.33.4" // From 0.34.5
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6", // From 2.4.2
    "@types/node": "^20.16.13",
    "@types/pg": "^8.11.0", // From 8.4.1
    "@types/uuid": "^9.0.8", // From 8.3.3
    "typescript": "^5.5.4",
    "eslint": "^8.57.0",
    "prettier": "^3.3.3" // From 2.1.2
  }
}
```

### Phase 3: Medium Priority
**Priority**: 1 week

- **lodash**: Upgrade to 4.17.23 (from 4.17.5 in types)
- **undici**: Update to 6.19.2 (if used)
- **braces**: Update to 3.0.3
- **brace-expansion**: Update to 2.0.1
- **picomatch**: Update to 4.0.2
- **uuid**: Update to 9.0.1 (already in plan)
- **ws**: Update to 8.17.1 (if used)

## Implementation Plan

### Step 1: Test Environment
1. Create feature branch: `security/dependabot-upgrades-2026`
2. Test each upgrade individually
3. Run smoke tests
4. Check for breaking changes

### Step 2: Gradual Rollout
1. Upgrade marketplace-hub (simplest, lowest impact)
2. Upgrade frontend
3. Upgrade legacy backend
4. Upgrade Go dependencies

### Step 3: Verification
```bash
# After each upgrade:
npm audit fix --force  # if needed
npm test
npm run build
docker build -f Dockerfile.business .
```

## Risk Mitigation

### Breaking Changes to Watch For:
1. **axios v1.6.0+**: `maxBodyLength` behavior change
2. **sequelize v6**: Breaking API changes
3. **multer v2**: Breaking change in file handling
4. **protobufjs v6**: Major API changes

### Backward Compatibility:
- Keep MUI v4 (upgrade to v5 requires code changes)
- Test all file uploads
- Verify JWT tokens work
- Test WhatsApp connections

### Rollback Plan:
1. Create tagged releases before upgrades
2. Have Docker images ready with old versions
3. Update docker-compose files to pin versions

## Timeline
- **Critical fixes**: Day 1
- **High priority**: Day 2-3
- **Medium priority**: Week 2
- **Documentation updates**: Week 2

## Cost Estimate
- Development time: ~3-5 days
- Testing time: ~2 days
- Risk mitigation: ~1 day

## Additional Notes
- Consider enabling Dependabot security updates in GitHub settings
- Create a security test suite that runs on all PRs
- Update dependency update frequency to weekly
- Consider upgrading from legacy Node.js backend to Go backend long-term