# 实施结果

`src/lib/app-update-version.ts` 复用现有的稳定版本比较，仅对高于当前版本的目标生成项目 GitHub Release 链接。

`src/components/features/settings/app-update-settings.tsx` 在工作区和设置页共用的版本信息旁显示链接。`electron/main.ts` 在手动检查更新的对话框增加同版本的查看按钮，交由系统浏览器打开。两个入口都提供了项目支持的 11 种语言文案。
