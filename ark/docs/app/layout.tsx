import "app/global.css"
import "fumadocs-twoslash/twoslash.css"
import { RootProvider } from "fumadocs-ui/provider"
import { Raleway } from "next/font/google"
import type { ReactNode } from "react"
import { ReleaseBanner } from "../components/ReleaseBanner.tsx"
import { CSPostHogProvider } from "./providers.tsx"

const raleway = Raleway({
	subsets: ["latin"]
})

export default ({ children }: { children: ReactNode }) => (
	<html lang="en" className={raleway.className} suppressHydrationWarning>
		<link rel="icon" href="/image/favicon.svg" />
		<body className="flex flex-col min-h-screen">
			<RootProvider
				search={{
					options: {
						type: "static"
					}
				}}
				theme={{
					enableSystem: false,
					defaultTheme: "dark"
				}}
			>
				<CSPostHogProvider>
					<ReleaseBanner />
					{children}
				</CSPostHogProvider>
			</RootProvider>
		</body>
	</html>
)
