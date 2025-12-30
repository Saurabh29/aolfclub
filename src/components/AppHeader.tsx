import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from "~/components/ui/dropdown-menu";
import { Button } from "./ui/button";

export default function AppHeader() {
	return (
		<header class="bg-white border-b border-gray-200">
			<div class="container mx-auto flex items-center justify-between p-3">
				<div class="flex items-center">
					<img
						src="https://www.artofliving.org/sites/www.artofliving.org/files/styles/original_image/public/wysiwyg_imageupload/aolf_logo_1.png?itok=II6rUsDd"
						alt="Art of Living"
						class="h-10 w-auto"
					/>
				</div>

				<div>
					<DropdownMenu>
						<DropdownMenuTrigger
							as={Button<"button">}
							variant="ghost"
							size="icon"
							class="h-10 w-10 p-0 rounded-full bg-white text-gray-700 border border-gray-200 shadow-sm"
						>
							<svg
								class="w-5 h-5 text-gray-700"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6"
								/>
							</svg>
						</DropdownMenuTrigger>
						<DropdownMenuContent class="w-48">
							<DropdownMenuItem>
								<a
									href="/api/auth/signin?provider=google"
									class="flex items-center gap-2"
								>
									<img
										src="https://www.google.com/favicon.ico"
										alt="Google"
										class="h-4 w-4"
									/>
									<span>Sign in with Google</span>
								</a>
							</DropdownMenuItem>
							<DropdownMenuItem>
								<a
									href="/api/auth/signin?provider=github"
									class="flex items-center gap-2"
								>
									<img
										src="https://github.githubassets.com/favicons/favicon.svg"
										alt="GitHub"
										class="h-4 w-4"
									/>
									<span>Sign in with GitHub</span>
								</a>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</header>
	);
}
