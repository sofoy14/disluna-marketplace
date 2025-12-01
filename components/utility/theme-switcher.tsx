import { IconMoon, IconSun } from "@tabler/icons-react"
import { useTheme } from "next-themes"
import { FC } from "react"
import { SIDEBAR_ICON_SIZE } from "../sidebar/sidebar-switcher"
import { Button } from "../ui/button"

interface ThemeSwitcherProps {}

export const ThemeSwitcher: FC<ThemeSwitcherProps> = () => {
  const { setTheme, theme } = useTheme()

  const handleChange = async (newTheme: "dark" | "light") => {
    localStorage.setItem("theme", newTheme)
    setTheme(newTheme)
    
    // Guardar en backend
    try {
      await fetch('/api/user/update-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeMode: newTheme })
      })
    } catch (error) {
      console.error('Error saving theme preference:', error)
    }
  }

  return (
    <Button
      className="flex cursor-pointer space-x-2"
      variant="ghost"
      size="icon"
      onClick={() => handleChange(theme === "light" ? "dark" : "light")}
    >
      {theme === "dark" ? (
        <IconMoon size={SIDEBAR_ICON_SIZE} />
      ) : (
        <IconSun size={SIDEBAR_ICON_SIZE} />
      )}
    </Button>
  )
}
