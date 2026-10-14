import {defineConfig} from '@playwright/test';

export default defineConfig({
  // Software WebGL in cloud CI is much slower than the device's GPU.
  testDir: './tests', timeout: 240_000, fullyParallel: false, workers: 1,
  reporter: 'list',
  use: {baseURL:'http://127.0.0.1:4173',viewport:{width:1194,height:834},hasTouch:true,trace:process.env.TRACE_TESTS?'retain-on-failure':'off'},
  webServer:{command:'npm run preview -- --port 4173 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI},
  projects:[
    {name:'chromium-tablet',use:{browserName:'chromium',launchOptions:{executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}}},
    ...(process.env.TEST_WEBKIT ? [{name:'webkit-tablet',use:{browserName:'webkit' as const}}] : []),
  ],
});
