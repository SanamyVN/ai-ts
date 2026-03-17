## [1.3.0](https://github.com/SanamyVN/ai-ts/compare/v1.2.0...v1.3.0) (2026-03-17)

### Features

* **config:** add optional embeddingProvider for OpenAI-compatible providers ([c320064](https://github.com/SanamyVN/ai-ts/commit/c3200645ffcab102cc05904b5c997fe8c0e21bb0))
* **rag:** use OpenAICompatibleConfig when embeddingProvider is set ([761db33](https://github.com/SanamyVN/ai-ts/commit/761db3335148f97e0139b3b1aef75cb53f2e0067))
* **voice:** add app layer DTOs, errors, tokens, and mapper ([2395c31](https://github.com/SanamyVN/ai-ts/commit/2395c31a1f4cea5ae8b2a28a8dc36847f162a982))
* **voice:** add app layer service, router, providers, and module ([d472a4a](https://github.com/SanamyVN/ai-ts/commit/d472a4a90e308b3fec87fcc21b8d384c32d62661))
* **voice:** add IMastraVoiceTts, IMastraVoiceStt, IMastraVoiceRealtime interfaces and DI tokens ([512b3cf](https://github.com/SanamyVN/ai-ts/commit/512b3cff3a4c44ad62680a5be2d4ed3a2af8f107))
* **voice:** add MastraVoiceRealtimeAdapter with tests ([ff96fb4](https://github.com/SanamyVN/ai-ts/commit/ff96fb4ea5330c2a7f144299052c6aa448f07dd3))
* **voice:** add MastraVoiceSttAdapter with tests ([49c292f](https://github.com/SanamyVN/ai-ts/commit/49c292fbd6913fa764b95aac686996dbb497cd4b))
* **voice:** add MastraVoiceTtsAdapter with tests ([4d8a051](https://github.com/SanamyVN/ai-ts/commit/4d8a051c7858da85ff20a9854c6240cd5bf88e51))
* **voice:** add voice business providers, testing utilities, and client contracts ([64d4327](https://github.com/SanamyVN/ai-ts/commit/64d43279fa43be98aeb662051af25799de4f8e0a))
* **voice:** add voice domain models and error classes ([bf71141](https://github.com/SanamyVN/ai-ts/commit/bf711417025435eea13b66d3677d7da4a2a8635c))
* **voice:** add voice mediator clients (local and remote) ([cb3124c](https://github.com/SanamyVN/ai-ts/commit/cb3124c222f73b0f4468cae72e5efe7cfb71a3e9))
* **voice:** add VoiceBusiness with tests ([71f2199](https://github.com/SanamyVN/ai-ts/commit/71f21994d9bec35220b109d29708445f07291aae))
* **voice:** register voice adapters in providers and add mock factories ([b09f736](https://github.com/SanamyVN/ai-ts/commit/b09f736734906cce0251773c103a038b5801ae3a))

### Bug Fixes

* **config:** use z.url() instead of deprecated z.string().url() ([e3f4f55](https://github.com/SanamyVN/ai-ts/commit/e3f4f55f95c94fb1dcbca7c6b5bdca697b2c7ca2))
* **voice:** resolve lint errors in voice interfaces and TTS adapter ([0cd77d6](https://github.com/SanamyVN/ai-ts/commit/0cd77d640c7897606b1052d5c5c5fe45e767a9de))
* **voice:** restore voice package exports from main ([4f90340](https://github.com/SanamyVN/ai-ts/commit/4f90340cc544018bac173b580b18aeec90b37300))

## [1.2.0](https://github.com/SanamyVN/ai-ts/compare/v1.1.0...v1.2.0) (2026-03-16)

### Features

* **voice:** add app layer DTOs, errors, tokens, and mapper ([cc17629](https://github.com/SanamyVN/ai-ts/commit/cc176299fc6bdfc6a6b84d34cec8a216c38e6687))
* **voice:** add app layer service, router, providers, and module ([87bf02f](https://github.com/SanamyVN/ai-ts/commit/87bf02fd577e8c67e4e5418ecbc75fca44435e34))
* **voice:** add IMastraVoiceTts, IMastraVoiceStt, IMastraVoiceRealtime interfaces and DI tokens ([8ed7d52](https://github.com/SanamyVN/ai-ts/commit/8ed7d52c385f7b2c176bf08eeda6f0be64c8e3a8))
* **voice:** add MastraVoiceRealtimeAdapter with tests ([5604d7b](https://github.com/SanamyVN/ai-ts/commit/5604d7b4cd25235463b8860aa9b11d73a43720ca))
* **voice:** add MastraVoiceSttAdapter with tests ([2b90b62](https://github.com/SanamyVN/ai-ts/commit/2b90b62a553c952bd9eacaed43085d2076d48f0b))
* **voice:** add MastraVoiceTtsAdapter with tests ([ae79a4e](https://github.com/SanamyVN/ai-ts/commit/ae79a4e64c5b3ac96edbf1416436be64edeeeda1))
* **voice:** add voice business providers, testing utilities, and client contracts ([6a6f046](https://github.com/SanamyVN/ai-ts/commit/6a6f0463e093df08fbc4e8e514bf7b1c33097524))
* **voice:** add voice domain models and error classes ([78a955b](https://github.com/SanamyVN/ai-ts/commit/78a955b35cc1f313a6d4d11b01252a2db4839b64))
* **voice:** add voice mediator clients (local and remote) ([970b640](https://github.com/SanamyVN/ai-ts/commit/970b64014b0c86a1d3a2dd2013a6b5a03048c90f))
* **voice:** add VoiceBusiness with tests ([9dd4238](https://github.com/SanamyVN/ai-ts/commit/9dd423811f894009b5fb2258458a799ec79f72cc))
* **voice:** register voice adapters in providers and add mock factories ([254a100](https://github.com/SanamyVN/ai-ts/commit/254a10028f2569a5c0484f15cd71285f9bf193ac))

### Bug Fixes

* **voice:** resolve lint errors in voice interfaces and TTS adapter ([e0c85a5](https://github.com/SanamyVN/ai-ts/commit/e0c85a5e081a8728e49e94fab7f089221f925c21))
* **voice:** restore voice package exports from main ([970e4a2](https://github.com/SanamyVN/ai-ts/commit/970e4a2c8b2d7ae5ea062894a22b06b2acafaf5d))

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
