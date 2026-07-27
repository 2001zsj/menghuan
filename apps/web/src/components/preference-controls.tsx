"use client";
import { SegmentedControl } from "@menghuan/ui";
import { useUiPreferences } from "@/providers/ui-preferences-provider";

export function ThemeControl() {
  const { theme, setTheme } = useUiPreferences();
  return (
    <SegmentedControl
      label="主题"
      value={theme}
      onChange={setTheme}
      testId="theme-control"
      options={[
        { value: "system", label: "系统" },
        { value: "light", label: "浅色" },
        { value: "dark", label: "深色" },
      ]}
    />
  );
}
export function TimezoneControl() {
  const { timezone, setTimezone } = useUiPreferences();
  return (
    <SegmentedControl
      label="展示时区"
      value={timezone}
      onChange={setTimezone}
      testId="timezone-control"
      options={[
        { value: "Asia/Shanghai", label: "北京" },
        { value: "Asia/Tokyo", label: "日本" },
      ]}
    />
  );
}
