import { A } from "@solidjs/router";
import Counter from "~/components/Counter";
import AppHeader from "~/components/AppHeader";

export default function Home() {
	return (
		<div class="min-h-screen bg-white text-gray-800">
			<AppHeader />
			<main class="text-center mx-auto max-w-4xl p-8">
				<h1 class="text-6xl text-sky-700 font-thin uppercase my-16">Welcome</h1>
				<Counter />
				<p class="mt-8 text-gray-600">
					Visit{" "}
					<a
						href="https://solidjs.com"
						target="_blank"
						class="text-sky-600 hover:underline"
					>
						solidjs.com
					</a>{" "}
					to learn how to build Solid apps.
				</p>
				<p class="my-4">
					<span>Home</span>
					{" - "}
					<A href="/about" class="text-sky-600 hover:underline">
						About Page
					</A>
				</p>
			</main>
		</div>
	);
}
