import { createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";
import { queryUsersQuery, queryLocationsQuery } from "~/server/api";

export default function UsersPage() {
  // Query users with default pagination
  const users = createAsync(() => 
    queryUsersQuery({
      filters: [],
      sorting: [{ field: "displayName", direction: "asc" }],
      pagination: { pageSize: 10, pageIndex: 0 },
    })
  );

  // Query locations
  const locations = createAsync(() =>
    queryLocationsQuery({
      filters: [{ field: "isActive", op: "eq", value: true }],
      sorting: [{ field: "name", direction: "asc" }],
      pagination: { pageSize: 5, pageIndex: 0 },
    })
  );

  return (
    <main class="container mx-auto p-8">
      <h1 class="text-4xl font-bold mb-8">Phase 2 Demo: Users & Locations</h1>
      
      {/* Users Section */}
      <section class="mb-12">
        <h2 class="text-2xl font-semibold mb-4">Users</h2>
        <Show when={users()} fallback={<p>Loading users...</p>}>
          {(data) => (
            <>
              <div class="mb-4 text-sm text-gray-600">
                Showing {data().items.length} of {data().pageInfo.totalCount ?? 0} users
              </div>
              <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <For each={data().items}>
                  {(user) => (
                    <div class="border rounded-lg p-4 bg-white shadow-sm">
                      <div class="flex items-start gap-3">
                        <Show when={user.image}>
                          <img 
                            src={user.image} 
                            alt={user.displayName}
                            class="w-12 h-12 rounded-full"
                          />
                        </Show>
                        <div class="flex-1">
                          <h3 class="font-semibold text-lg">{user.displayName}</h3>
                          <p class="text-sm text-gray-600">{user.email}</p>
                          <div class="mt-2 flex gap-2">
                            <span class={`text-xs px-2 py-1 rounded ${
                              user.userType === "LEAD" 
                                ? "bg-blue-100 text-blue-800" 
                                : "bg-green-100 text-green-800"
                            }`}>
                              {user.userType}
                            </span>
                            <Show when={user.isAdmin}>
                              <span class="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                                Admin
                              </span>
                            </Show>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </>
          )}
        </Show>
      </section>

      {/* Locations Section */}
      <section>
        <h2 class="text-2xl font-semibold mb-4">Active Locations</h2>
        <Show when={locations()} fallback={<p>Loading locations...</p>}>
          {(data) => (
            <>
              <div class="mb-4 text-sm text-gray-600">
                Showing {data().items.length} active locations
              </div>
              <div class="grid gap-4 md:grid-cols-2">
                <For each={data().items}>
                  {(location) => (
                    <div class="border rounded-lg p-4 bg-white shadow-sm">
                      <h3 class="font-semibold text-lg">{location.name}</h3>
                      <p class="text-sm text-gray-600 mb-2">
                        Code: <span class="font-mono">{location.code}</span>
                      </p>
                      <Show when={location.address}>
                        <p class="text-sm text-gray-700">
                          {location.address}<br />
                          {location.city}, {location.state} {location.zipCode}
                        </p>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </>
          )}
        </Show>
      </section>

      {/* Section showing query-as-data pattern */}
      <section class="mt-12 p-6 bg-gray-50 rounded-lg">
        <h2 class="text-xl font-semibold mb-4">🎯 Query-as-Data Pattern Demo</h2>
        <div class="space-y-4 text-sm">
          <div>
            <h3 class="font-semibold mb-2">Users Query:</h3>
            <pre class="bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
{`queryUsersQuery({
  filters: [],
  sorting: [{ field: "displayName", direction: "asc" }],
  pagination: { pageSize: 10, pageIndex: 0 }
})`}
            </pre>
          </div>
          <div>
            <h3 class="font-semibold mb-2">Locations Query:</h3>
            <pre class="bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
{`queryLocationsQuery({
  filters: [{ field: "isActive", op: "eq", value: true }],
  sorting: [{ field: "name", direction: "asc" }],
  pagination: { pageSize: 5, pageIndex: 0 }
})`}
            </pre>
          </div>
        </div>
      </section>
    </main>
  );
}
