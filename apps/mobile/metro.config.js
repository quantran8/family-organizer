const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo: Metro phải thấy được packages/domain (source TS, không qua build)
// và node_modules ở gốc workspace do pnpm hoisting.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// pnpm dùng symlink; tắt hierarchical lookup để Metro không đi ngược lên nhầm chỗ.
config.resolver.disableHierarchicalLookup = true;

/**
 * `packages/domain` viết import kèm đuôi `.js` (`from './types/base.js'`) dù
 * file thật là `.ts`. Đó KHÔNG phải nhầm lẫn — đó là yêu cầu của Deno, runtime
 * thứ hai tiêu thụ package này (supabase/functions): Deno nạp thẳng từ source
 * và bắt buộc đường dẫn tương đối phải có đuôi đầy đủ.
 *
 * Metro thì ngược lại: nó thấy `.js`, đi tìm file `.js`, không có, và dừng.
 *
 * Bỏ đuôi đi để chiều Metro sẽ làm hỏng Edge Functions; thêm bước build để sinh
 * `.js` thật thì mất đúng thứ 01 §1 muốn (domain nạp thẳng từ source, không qua
 * build). Nên: bỏ đuôi ở TẦNG RESOLVE, chỉ cho package này, và chỉ khi đích là
 * đường dẫn tương đối bên trong nó.
 */
const domainSrc = path.resolve(workspaceRoot, 'packages/domain/src');
const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromDomain = context.originModulePath?.startsWith(domainSrc);
  if (fromDomain && moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    moduleName = moduleName.slice(0, -3);
  }
  return upstreamResolveRequest
    ? upstreamResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
