import { createGlobalContainerSetup, postgres } from '@sanamyvn/foundation/testing/global-setup';

export default createGlobalContainerSetup([postgres()]);
