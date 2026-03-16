## [1.1.0](https://github.com/SanamyVN/ai-ts/compare/v1.0.1...v1.1.0) (2026-03-16)

### Features

* **rag:** add embeddingModel and embeddingDimension to aiConfigSchema ([ff52846](https://github.com/SanamyVN/ai-ts/commit/ff528461f6eaf58505eb930a03d64344274de7b5))
* **rag:** add IMastraRag interface and DI tokens ([e44cf25](https://github.com/SanamyVN/ai-ts/commit/e44cf25674b6799a5e0205998c29978eb431951b))
* **rag:** add IRagBusiness interface and DI token ([403c70e](https://github.com/SanamyVN/ai-ts/commit/403c70e925aea53895ea63b5da0af9f3e542d2d7))
* **rag:** add peer dependencies and package exports for RAG domain ([4a6baf0](https://github.com/SanamyVN/ai-ts/commit/4a6baf0bca40dab4d21ce8cd1f7b225e0298fc3d))
* **rag:** add RAG app DTOs ([2c810b6](https://github.com/SanamyVN/ai-ts/commit/2c810b60ed19915af5c64ce6838d0b83eeb0d8c1))
* **rag:** add RAG app module, providers, and composition ([e5528fb](https://github.com/SanamyVN/ai-ts/commit/e5528fb98ed9be5d485bddd4519fc267bf574829))
* **rag:** add RAG app service with error mapping ([8824e29](https://github.com/SanamyVN/ai-ts/commit/8824e29a0415a0d4937fcb4d97c62ee0e08cb6ee))
* **rag:** add RAG app tokens, error mapping, and mapper ([b944a7b](https://github.com/SanamyVN/ai-ts/commit/b944a7b84e0994279e32ca337db71e28a7081b99))
* **rag:** add RAG business error hierarchy ([d19db24](https://github.com/SanamyVN/ai-ts/commit/d19db24cbfd2f255ba47202e5b6028ef97518f1f))
* **rag:** add RAG business providers, testing mock, and composition ([6ce5891](https://github.com/SanamyVN/ai-ts/commit/6ce5891c25c483d424376721656a364b0e73dd0a))
* **rag:** add RAG client mediator contracts ([904ad6f](https://github.com/SanamyVN/ai-ts/commit/904ad6f630bf4d9b45b098c493afef224fd37907))
* **rag:** add RAG client SDK with local and remote mediators ([1db5ebf](https://github.com/SanamyVN/ai-ts/commit/1db5ebf497f993c11c20bbac03f66d49b418d756))
* **rag:** add RAG client Zod schemas ([6d1b9a9](https://github.com/SanamyVN/ai-ts/commit/6d1b9a977577a17e4b821a2eecc5f80312e4082e))
* **rag:** add RAG domain models ([65186e7](https://github.com/SanamyVN/ai-ts/commit/65186e799a2e9057b4662386fe709d167b39cad5))
* **rag:** add RAG REST router ([44b602e](https://github.com/SanamyVN/ai-ts/commit/44b602e4268f5c3a6273077cab0949250cb503a9))
* **rag:** implement MastraRagAdapter wrapping PgVector ([4942901](https://github.com/SanamyVN/ai-ts/commit/4942901a7e9f9a9c8d2b83f8b3b1aa4495e8b5c3))
* **rag:** implement RagBusiness with chunk-embed-store pipeline ([d4126ed](https://github.com/SanamyVN/ai-ts/commit/d4126ed613e89b6f2f9d4c27b319d9537424a4cd))
* **rag:** register MastraRagAdapter in providers and add mock ([3c3bd30](https://github.com/SanamyVN/ai-ts/commit/3c3bd30a83c34b9310eff8798a97bed022cae579))

### Bug Fixes

* **rag:** resolve lint errors (type assertion disables, mock class) ([0e9395b](https://github.com/SanamyVN/ai-ts/commit/0e9395bd050789deaf4c8fb359abba48fa8aca0b))

## [1.0.1](https://github.com/SanamyVN/ai-ts/compare/v1.0.0...v1.0.1) (2026-03-16)

### Bug Fixes

- type prompt service mock factory for TypeScript compatibility ([bb1b17e](https://github.com/SanamyVN/ai-ts/commit/bb1b17ee669b3d8dccfd663e1b0b867f371e5da3))

## 1.0.0 (2026-03-16)

### Features

- add AI config schema with defaults ([40a76fb](https://github.com/SanamyVN/ai-ts/commit/40a76fbd885d765fc025779b19c81cb30201ccab))
- add app layer providers and package.json exports ([de4f2bd](https://github.com/SanamyVN/ai-ts/commit/de4f2bd303447de2f11ae00ecfa74e8d66c82c85))
- add business layer provider bundle ([ab3e9f8](https://github.com/SanamyVN/ai-ts/commit/ab3e9f816e4af1f4ab31599eb466f5de5b431fa7))
- add conversation app layer ([8562880](https://github.com/SanamyVN/ai-ts/commit/8562880647f7d625927690fb44dda42f921d14b0))
- add conversation engine with prompt resolution and session orchestration ([de91fdc](https://github.com/SanamyVN/ai-ts/commit/de91fdca6546667a0c156b95aa06b72327c62abc))
- add conversation mediator client module ([0c16aec](https://github.com/SanamyVN/ai-ts/commit/0c16aec043a15e5dd75ece8eb4e03b1084634ffc))
- add integration test fixture ([65849e8](https://github.com/SanamyVN/ai-ts/commit/65849e889078998aa1784dcba4f83e11ccdb00f9))
- add Mastra adapter interfaces and error ([dccd1c2](https://github.com/SanamyVN/ai-ts/commit/dccd1c2355d8fae852068c2a42c46ea3eb51d2ee))
- add Mastra agent and memory adapters ([b9db630](https://github.com/SanamyVN/ai-ts/commit/b9db6302d242f0cf1e4c17b40196ec23009d455a))
- add prompt app layer with per-route middleware config ([cdab646](https://github.com/SanamyVN/ai-ts/commit/cdab646850023c18faa8e0a9e271b04dede5dbb8))
- add prompt business errors and models ([fba1150](https://github.com/SanamyVN/ai-ts/commit/fba11500fbd98c7e815774860ad1eede9be3a1de))
- add prompt business service with versioning and template rendering ([06024ae](https://github.com/SanamyVN/ai-ts/commit/06024ae6e773ae0b2dc3fa9a3d74f70dece2b4ee))
- add prompt mediator client module ([e6a02cc](https://github.com/SanamyVN/ai-ts/commit/e6a02cc8eea1f8e8bc76aab75e333eb9aff4966d))
- add prompt mediator contracts ([34e2cc8](https://github.com/SanamyVN/ai-ts/commit/34e2cc8c5e1ca50e191bfbcf01e6ea4151e3fdcb))
- add prompt repository with Drizzle implementation ([12d3333](https://github.com/SanamyVN/ai-ts/commit/12d3333005f2196c3730ddf2eb81f256753c0d4f))
- add prompt version repository ([e87e1bd](https://github.com/SanamyVN/ai-ts/commit/e87e1bdea09700e89ff9746fc10f15c0b4eb8d96))
- add repository layer provider bundle ([babfd6a](https://github.com/SanamyVN/ai-ts/commit/babfd6ab1b080b64cc8dcf7d6ae9e0dab6806f11))
- add session app layer ([6bf5afc](https://github.com/SanamyVN/ai-ts/commit/6bf5afc6d293ad2ba4970d8b2b882d785f2094c1))
- add session business service with Mastra thread integration ([3927914](https://github.com/SanamyVN/ai-ts/commit/392791429ac7738828943a47988b5d5df8420079))
- add session mediator client module ([f6ea80d](https://github.com/SanamyVN/ai-ts/commit/f6ea80da7aaa11db7f4e21f4720976c1f5b64886))
- add session repository ([4203cf7](https://github.com/SanamyVN/ai-ts/commit/4203cf78a753841bcd3bbbcf46ce715b167422d3))
- add shared DI tokens ([ff778a7](https://github.com/SanamyVN/ai-ts/commit/ff778a7a2deecabb1abd15f0855ae18d3348a402))

### Bug Fixes

- commit missing prompt interface and mapper files ([b684c3f](https://github.com/SanamyVN/ai-ts/commit/b684c3f6fe9018f2fe90aacec76c82b0721d9c99))
- persist resolved prompt in session for stateless reconstruction ([a040171](https://github.com/SanamyVN/ai-ts/commit/a0401716d901ff1bcaa39a4d07592328e60efd43))
- resolve all lint errors ([037026d](https://github.com/SanamyVN/ai-ts/commit/037026d2ce2fc4fa56ab1983b3307d4089211f4b))
- type mock factories to expose Mock methods ([a456824](https://github.com/SanamyVN/ai-ts/commit/a4568246fb91e0142e6e274e39203b89887071eb))
- unique violation detection for node-postgres and reconstruction test ([082847a](https://github.com/SanamyVN/ai-ts/commit/082847a700e4aa1c19a7ee627dbe88809270e042))
