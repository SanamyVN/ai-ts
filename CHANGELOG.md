## [1.21.0](https://github.com/SanamyVN/ai-ts/compare/v1.20.1...v1.21.0) (2026-03-31)

### Features

* **realtime-voice:** add optional speakerGender to client schema and app DTO ([2939cb1](https://github.com/SanamyVN/ai-ts/commit/2939cb1df4d963734ab582c0915d7e9fa7168831))
* **realtime-voice:** add optional speakerGender to ProcessAudioInput and ConversationPipelineState ([32d082a](https://github.com/SanamyVN/ai-ts/commit/32d082ad73ba42c6c5aaf28b92b6ab4b3fed34bd))
* **voice:** remove defaultSpeakerGender from VoiceTtsConfig and config schema ([f526588](https://github.com/SanamyVN/ai-ts/commit/f52658892664722b1da5402f5dc2af6472356c58))

## [1.20.1](https://github.com/SanamyVN/ai-ts/compare/v1.20.0...v1.20.1) (2026-03-31)

### Bug Fixes

* **voice:** normalize OpenAI provider config ([5b19f6a](https://github.com/SanamyVN/ai-ts/commit/5b19f6a9e94089acf0f49ffb3111026cf07df942))

## [1.20.0](https://github.com/SanamyVN/ai-ts/compare/v1.19.0...v1.20.0) (2026-03-30)

### Features

* **session:** add userIds array filter to session repository ([a3c19f8](https://github.com/SanamyVN/ai-ts/commit/a3c19f8643bdb2162ed61fe47fdb0032d84ea98c))
* **session:** add userIds to session filter across business and client layers ([336d91e](https://github.com/SanamyVN/ai-ts/commit/336d91e4b8a59a56270a97cd9d9c41133478265f))

## [1.19.0](https://github.com/SanamyVN/ai-ts/compare/v1.18.0...v1.19.0) (2026-03-30)

### Features

* **config:** add nested tts voice mapping ([40fa510](https://github.com/SanamyVN/ai-ts/commit/40fa51079592a77de3d35762ad8f05de1f3a1ff8))
* **realtime-voice:** use voice tts config for default speaker gender ([d09b240](https://github.com/SanamyVN/ai-ts/commit/d09b240d36d2d870c92d73823eaacd39fe12c5d9))
* **voice:** pass speakerGender through mediators ([94cb896](https://github.com/SanamyVN/ai-ts/commit/94cb896bdb61fa152bbe78dba1b5e7013e7b7abe))
* **voice:** replace speaker with speakerGender contract ([4cd2968](https://github.com/SanamyVN/ai-ts/commit/4cd2968ca55aff91926dc3effc23f0554f166ad1))
* **voice:** resolve speakerGender via injected tts config ([75861be](https://github.com/SanamyVN/ai-ts/commit/75861bef090a23cbc91f173a36dcae07da93d5d2))

### Bug Fixes

* **ci:** satisfy lint in realtime voice spec ([5f7ad9e](https://github.com/SanamyVN/ai-ts/commit/5f7ad9ea570eda46179e54a19f7cc6713f4707e2))
* **voice:** drive realtime and speaker mapping from ai config ([2c65888](https://github.com/SanamyVN/ai-ts/commit/2c65888c392c84c64cbad470d52d4872725561c1))
* **voice:** enforce speakerGender resolution precedence ([54c50ea](https://github.com/SanamyVN/ai-ts/commit/54c50eac1b36d56a0895cfff909af8bd803011c4))

## [1.18.0](https://github.com/SanamyVN/ai-ts/compare/v1.17.0...v1.18.0) (2026-03-30)

### Features

* rename Whisper/Speaches adapters to OpenAI STT/TTS ([86afbcf](https://github.com/SanamyVN/ai-ts/commit/86afbcf81afe38d84087a58f54fd8bbfd671aaa8))

## [1.17.0](https://github.com/SanamyVN/ai-ts/compare/v1.16.0...v1.17.0) (2026-03-28)

### Features

* **business:** add updateLastMessage to session service ([25e1679](https://github.com/SanamyVN/ai-ts/commit/25e167924b4d8ebd7363d8cc86748b4eddb84680))
* **client-queries:** add UpdateSessionLastMessageCommand ([7ca30aa](https://github.com/SanamyVN/ai-ts/commit/7ca30aaa04b646ed8098f826a683b0f14e8640cf))
* **client-schema:** add lastMessage and lastMessageAt to session client schemas ([327e250](https://github.com/SanamyVN/ai-ts/commit/327e250f27e1f8a0f802ecd9840fe4b91b0d1649))
* **client-schema:** add message schemas ([3f1d417](https://github.com/SanamyVN/ai-ts/commit/3f1d417ec164da10e311e2a520522baa5bd982c5))
* **client:** add GetSessionMessagesQuery and getMessages to ISessionMediator ([f6c260f](https://github.com/SanamyVN/ai-ts/commit/f6c260f8bc4f6d08946be02c856a437c11d714f6))
* **conversation:** update lastMessage after send() completes ([82515d8](https://github.com/SanamyVN/ai-ts/commit/82515d8bd5f364abfd3ff96807daa38b51d5b993))
* **conversation:** update lastMessage after stream() finishes accumulating text ([e80ae39](https://github.com/SanamyVN/ai-ts/commit/e80ae3917a57d4e053ad081b1bbd7b2d23199a73))
* **local-mediator:** implement getMessages in SessionLocalMediator ([e829c40](https://github.com/SanamyVN/ai-ts/commit/e829c4086efe9d098aee020637c5ef9e5ec75981))
* **mapper:** add toMessageListClient ([5d9e06a](https://github.com/SanamyVN/ai-ts/commit/5d9e06aa05850e2b657965a6675a0942489e7b96))
* **mapper:** map lastMessage and lastMessageAt in session mappers ([58075f5](https://github.com/SanamyVN/ai-ts/commit/58075f55e6d730472814010e12039cbd5cf55ac0))
* **mediator:** handle UpdateSessionLastMessageCommand in local and remote mediators ([331fe83](https://github.com/SanamyVN/ai-ts/commit/331fe83bd4b32566a96528c93d33efde3eb7ba17))
* **model:** add lastMessage and lastMessageAt to Session and SessionSummary ([07eba15](https://github.com/SanamyVN/ai-ts/commit/07eba158c28e69c7e31f67c58143a4e3598d937d))
* **remote-mediator:** implement getMessages in SessionRemoteMediator ([d361ccb](https://github.com/SanamyVN/ai-ts/commit/d361ccbe1c283b42cc6579b875d227b9ce0f7af5))
* **repository:** add updateLastMessage method to session repository ([82d52e1](https://github.com/SanamyVN/ai-ts/commit/82d52e16b7211befc780e7e882580e4babf3bc3e))
* **schema:** add lastMessage and lastMessageAt columns to ai_sessions ([a43e002](https://github.com/SanamyVN/ai-ts/commit/a43e0025aad2bf180973fd6967c00884f130b7c1))

### Bug Fixes

* **conversation:** guard send() lastMessage update against empty text ([9624972](https://github.com/SanamyVN/ai-ts/commit/9624972c2c0c3a65e4d728460f052d4f235a90f1))
* restore updateResolvedPrompt in mock factory and repo spec assertion ([daa63a5](https://github.com/SanamyVN/ai-ts/commit/daa63a5366f03b1fa4872b8c18be3ae524ae0491))

## [1.16.0](https://github.com/SanamyVN/ai-ts/compare/v1.15.1...v1.16.0) (2026-03-25)

### Features

* **rag:** add documentIds to SearchInput model ([a69ded7](https://github.com/SanamyVN/ai-ts/commit/a69ded74c24c6fc035a76cfb02d599333e8883fa))
* **rag:** add optional documentIds to search schema ([f9d89ba](https://github.com/SanamyVN/ai-ts/commit/f9d89ba2fe6f057583a7e999f2b7eb2a32f6cd3a))
* **rag:** pass documentIds through RagBusiness.search() ([26879dd](https://github.com/SanamyVN/ai-ts/commit/26879dd334f21e01cf8db0eca5a345d8bdc82563))
* **rag:** support documentIds filter in MastraRagAdapter.search() ([c67b271](https://github.com/SanamyVN/ai-ts/commit/c67b271fb83c8fa1cc47cc08a4e0b8d293522527))

## [1.15.1](https://github.com/SanamyVN/ai-ts/compare/v1.15.0...v1.15.1) (2026-03-24)

### Bug Fixes

* **session:** use 0-based page in exportTranscript for Mastra recall ([25a890d](https://github.com/SanamyVN/ai-ts/commit/25a890d7dd86632a715813b393c550f0859f508a))

## [1.15.0](https://github.com/SanamyVN/ai-ts/compare/v1.14.1...v1.15.0) (2026-03-23)

### Features

* **config:** add optional vad section to aiConfigSchema ([9e1bffb](https://github.com/SanamyVN/ai-ts/commit/9e1bffbf3aaa4308db186c5797c1ce2f15f634e8))
* **realtime-voice:** add preBuffer and speaking to pipeline state model ([7e1ebed](https://github.com/SanamyVN/ai-ts/commit/7e1ebedb68c1ffdea5260299c134d839b9d4e9da))
* **realtime-voice:** rewrite listening logic with pre-buffer and transition tracking ([d7a552c](https://github.com/SanamyVN/ai-ts/commit/d7a552c6d17c98a3ee5d538a13edb2e33d97f282))

## [1.14.1](https://github.com/SanamyVN/ai-ts/compare/v1.14.0...v1.14.1) (2026-03-23)

### Bug Fixes

* **whisper:** wrap raw PCM in WAV header before sending to STT server ([04cbbbd](https://github.com/SanamyVN/ai-ts/commit/04cbbbd52c8add97617647e03ffce8d61d6c3076))

## [1.14.0](https://github.com/SanamyVN/ai-ts/compare/v1.13.0...v1.14.0) (2026-03-23)

### Features

* **voice:** add Speaches TTS adapter for OpenAI-compatible TTS servers ([44e5e67](https://github.com/SanamyVN/ai-ts/commit/44e5e673775e5592f6be3610a9ff5f7db0ba6bd5))

## [1.13.0](https://github.com/SanamyVN/ai-ts/compare/v1.12.0...v1.13.0) (2026-03-23)

### Features

* **vad:** add vad-client SDK with monolith and standalone mediator adapters ([1ef5f9b](https://github.com/SanamyVN/ai-ts/commit/1ef5f9bcc4edd90ea5ae2f7630602b82aa715e6c))

## [1.12.0](https://github.com/SanamyVN/ai-ts/compare/v1.11.1...v1.12.0) (2026-03-23)

### Features

* **config:** add sttModel/sttProvider and ttsModel/ttsProvider to aiConfigSchema ([a2e5e18](https://github.com/SanamyVN/ai-ts/commit/a2e5e185103052e4ae86556bc1e8aa76c6acd68b))

## [1.11.1](https://github.com/SanamyVN/ai-ts/compare/v1.11.0...v1.11.1) (2026-03-23)

### Bug Fixes

* resolve lint errors in whisper and kokoro adapters ([0e1bc0b](https://github.com/SanamyVN/ai-ts/commit/0e1bc0b7bbd6b44b24b96ae98236c5a27f53d861))
* **whisper:** re-export WHISPER_CONFIG and WhisperConfig from providers ([b3a6f04](https://github.com/SanamyVN/ai-ts/commit/b3a6f046386f7e9266aed047ae27d8e45bdfb38f))
* **whisper:** use type guard instead of type assertion for JSON response ([d5ca7fb](https://github.com/SanamyVN/ai-ts/commit/d5ca7fbe73165abd13a32fad2816d38742c463d0))

## [1.11.0](https://github.com/SanamyVN/ai-ts/compare/v1.10.0...v1.11.0) (2026-03-21)

### Features

* add package.json exports for vad, realtime-voice, silero, whisper, kokoro ([976703f](https://github.com/SanamyVN/ai-ts/commit/976703fd467ab3f724ad176b9286d2a37e4f92c3))
* **kokoro:** add KokoroTtsAdapter implementing IMastraVoiceTts ([6966aad](https://github.com/SanamyVN/ai-ts/commit/6966aad26a2134d32f35376a5e358d12f4ef30a7))
* **realtime-voice:** add app layer (router, service, module, DTOs) ([74053b7](https://github.com/SanamyVN/ai-ts/commit/74053b739b9dc3939ad5622e6e44d80efcc06f5d))
* **realtime-voice:** add mediator client (schemas, queries, errors, mediator) ([1598cad](https://github.com/SanamyVN/ai-ts/commit/1598cad96d701fe9785a56a8742af6622740eb4f))
* **realtime-voice:** add pipeline interfaces, models, and errors ([e094b99](https://github.com/SanamyVN/ai-ts/commit/e094b995506682fac363d5d14c28fce198254c8d))
* **realtime-voice:** implement pipeline orchestrator with state machine and tests ([9da69d8](https://github.com/SanamyVN/ai-ts/commit/9da69d8a4a08b49e3a0c945e17ae76b9cf392259))
* **silero:** add SileroVadAdapter with hysteresis logic and tests ([dc55e2b](https://github.com/SanamyVN/ai-ts/commit/dc55e2b83054e5ce2c850adcb30aee0c28ea7b1e))
* **vad:** add app layer (router, service, module, DTOs) ([05be6b7](https://github.com/SanamyVN/ai-ts/commit/05be6b792c208171dc26fc78ec5c3bbae3ecdff3))
* **vad:** add business layer, mediator client, and tests ([dcdc947](https://github.com/SanamyVN/ai-ts/commit/dcdc9474d7f2020a2a27c41b0b33ee2972ea01fd))
* **vad:** add IVad interface, models, and DI tokens ([f724e2d](https://github.com/SanamyVN/ai-ts/commit/f724e2ddd6dfe5414201f312e8ad2c8ca4580787))
* **whisper:** add WhisperSttAdapter implementing IMastraVoiceStt ([59eabe3](https://github.com/SanamyVN/ai-ts/commit/59eabe3d8f00d1b05ab08185b6b47c758b6ac424))

### Bug Fixes

* replace void with undefined in voice interface return types ([3a16532](https://github.com/SanamyVN/ai-ts/commit/3a16532133a53970ffde3316e014c4d7c3863761))
* resolve TypeScript strict mode errors in adapters and tests ([1a5cf2a](https://github.com/SanamyVN/ai-ts/commit/1a5cf2a97d77d279e5c8d71aafb295726b07e2d3))

## [1.10.0](https://github.com/SanamyVN/ai-ts/compare/v1.9.0...v1.10.0) (2026-03-20)

### Features

* **rag:** add search to IMastraRag interface, MastraRagAdapter, and mock ([78be7c1](https://github.com/SanamyVN/ai-ts/commit/78be7c1a87561625e3fbed9d0635cf650604dfd5))
* **rag:** add search to IRagBusiness with embedding pipeline and tests ([b234f02](https://github.com/SanamyVN/ai-ts/commit/b234f025210836219b8d4ce6fa74b61e47f44de9))
* **rag:** add search types, schemas, RagSearchQuery, and mediator interface ([ae61841](https://github.com/SanamyVN/ai-ts/commit/ae61841b539b1666e45c18f5458f72107fedf1b2))
* **rag:** wire search through app layer — service, router, DTOs, mediators ([e1fbc5f](https://github.com/SanamyVN/ai-ts/commit/e1fbc5f807caa12d148de6c888f3787e40de1541))

### Bug Fixes

* **rag:** align search filter cast pattern with delete method ([07f4f63](https://github.com/SanamyVN/ai-ts/commit/07f4f637d3923b7ca353578ade8c9adef79dd547))
* **rag:** remove redundant QueryResult import and annotation in MastraRagAdapter ([20fd998](https://github.com/SanamyVN/ai-ts/commit/20fd9980e8306b1e0a4d2bc1534733f5f0ebf4c0))
* **rag:** remove unnecessary type cast in MastraRagAdapter.search ([440848f](https://github.com/SanamyVN/ai-ts/commit/440848fa95302cd148f9898f68c525269fe84dbe))
* **rag:** replace non-null assertion with guard in RagBusiness.search ([cfdc807](https://github.com/SanamyVN/ai-ts/commit/cfdc807814c73808de70ef9474d0932e32dedb6e))
* **rag:** replace type assertion with typeof guard in MastraRagAdapter.search ([3f3caf7](https://github.com/SanamyVN/ai-ts/commit/3f3caf7296a8cc460d91a9979276843ca048d0fe))
* **rag:** use T[] array syntax instead of Array<T> in IMastraRag and adapter ([509bb66](https://github.com/SanamyVN/ai-ts/commit/509bb6672d36b291c3594bd96ee3900e5b9288ac))

## [1.9.0](https://github.com/SanamyVN/ai-ts/compare/v1.8.0...v1.9.0) (2026-03-20)

### Features

* add indexName to RAG types/schemas/DTOs and remove createIndex ([fa823be](https://github.com/SanamyVN/ai-ts/commit/fa823bee18165feb0fa9c7e19fd67aa861eef297))

### Bug Fixes

* add min(1) validation to indexName in DTOs and fix formatting ([d63072a](https://github.com/SanamyVN/ai-ts/commit/d63072a9f2fa054ddddc9ab6df05f9ff149f544e))

## [1.8.0](https://github.com/SanamyVN/ai-ts/compare/v1.7.0...v1.8.0) (2026-03-18)

### Features

* add toolsets parameter to IConversationEngine send/stream ([acfc10b](https://github.com/SanamyVN/ai-ts/commit/acfc10bcae726f59ce5a10e49acd3b1b9493f94f))
* add toolsets to GenerateOptions interface ([0818ed3](https://github.com/SanamyVN/ai-ts/commit/0818ed36a243668db6b0e7c2eb72e4a079b50017))
* pass toolsets through ConversationBusiness to MastraAgent ([20f45d8](https://github.com/SanamyVN/ai-ts/commit/20f45d806a4a9f5e0d5b4040d334b8e521bc3a71))
* pass toolsets through MastraAgent adapter to Mastra core ([e730ef6](https://github.com/SanamyVN/ai-ts/commit/e730ef650d04d05234e7e78d13f8160e6105f159))
* update conversation engine mock to support toolsets parameter ([950936e](https://github.com/SanamyVN/ai-ts/commit/950936e3362536f37b54b5dc2efc7750b5176533))

## [1.7.0](https://github.com/SanamyVN/ai-ts/compare/v1.6.1...v1.7.0) (2026-03-18)

### Features

* **conversation:** re-resolve prompt on send() and pass resolvedPrompt as instructions ([f2d8798](https://github.com/SanamyVN/ai-ts/commit/f2d8798a2d6f3cbc7e92c612c28f48c8ee53b14a))
* **mastra:** add instructions passthrough to GenerateOptions and MastraAgentAdapter ([5fc4e42](https://github.com/SanamyVN/ai-ts/commit/5fc4e4213507889ab5cdf1cb4f26a6a7cc901101))
* **session:** add UpdateSessionCommand for persisting re-resolved prompts ([84844e7](https://github.com/SanamyVN/ai-ts/commit/84844e721a3fdcd950af20b88143eafa30f12922))

### Bug Fixes

* **lint:** resolve type assertion lint errors in mastra agent spec ([c0ce0ae](https://github.com/SanamyVN/ai-ts/commit/c0ce0aecd9649002ad248a965d04af0cea23c2cd))

## [1.6.1](https://github.com/SanamyVN/ai-ts/compare/v1.6.0...v1.6.1) (2026-03-18)

### Bug Fixes

* **conversation:** remove duplicate JSDoc blocks from send() and stream() ([6816301](https://github.com/SanamyVN/ai-ts/commit/68163019e683de626057048ae0e239716bd6fbcb))

## [1.6.0](https://github.com/SanamyVN/ai-ts/compare/v1.5.0...v1.6.0) (2026-03-17)

### Features

* **conversation:** add type-safe outputSchema flow to generate/stream ([2a0f2f6](https://github.com/SanamyVN/ai-ts/commit/2a0f2f63784fb5373d8033168772fc5b8409d72d))

## [1.5.0](https://github.com/SanamyVN/ai-ts/compare/v1.4.0...v1.5.0) (2026-03-17)

### Features

* **session:** add outputSchema jsonb column across all layers ([9c6b6d1](https://github.com/SanamyVN/ai-ts/commit/9c6b6d1d7fbae196af36bcb56aa8a3e46a127e50))

## [1.4.0](https://github.com/SanamyVN/ai-ts/compare/v1.3.0...v1.4.0) (2026-03-17)

### Features

* **config:** extract shared provider schema and add modelProvider field ([cf8b13f](https://github.com/SanamyVN/ai-ts/commit/cf8b13f46ae3bada8130bc7be1863893834719de))

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
