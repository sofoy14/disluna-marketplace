import { assertWorkspaceAccess } from "@/src/server/workspaces/access"

class MockQuery {
  private filters: Record<string, unknown> = {}

  constructor(
    private readonly table: string,
    private readonly fixtures: Record<string, any[]>
  ) {}

  select(_columns: string) {
    return this
  }

  eq(column: string, value: unknown) {
    this.filters[column] = value
    return this
  }

  async maybeSingle() {
    const rows = this.fixtures[this.table] ?? []
    const match =
      rows.find(row =>
        Object.entries(this.filters).every(([key, value]) => row[key] === value)
      ) ?? null
    return { data: match, error: null }
  }
}

class MockSupabaseClient {
  constructor(private readonly fixtures: Record<string, any[]>) {}

  from(table: string) {
    return new MockQuery(table, this.fixtures)
  }
}

describe("Workspace access guard", () => {
  test("allows workspace owner", async () => {
    const client = new MockSupabaseClient({
      workspaces: [{ id: "w1", user_id: "owner" }],
      workspace_members: []
    })

    await expect(
      assertWorkspaceAccess(client as any, "w1", "owner")
    ).resolves.toMatchObject({ isOwner: true, isMember: true, role: "ADMIN" })
  })

  test("allows workspace member", async () => {
    const client = new MockSupabaseClient({
      workspaces: [{ id: "w1", user_id: "owner" }],
      workspace_members: [{ workspace_id: "w1", user_id: "member", role: "VIEWER" }]
    })

    await expect(
      assertWorkspaceAccess(client as any, "w1", "member")
    ).resolves.toMatchObject({ isOwner: false, isMember: true, role: "VIEWER" })
  })

  test("denies user without membership", async () => {
    const client = new MockSupabaseClient({
      workspaces: [{ id: "w1", user_id: "owner" }],
      workspace_members: [{ workspace_id: "w1", user_id: "member", role: "VIEWER" }]
    })

    await expect(
      assertWorkspaceAccess(client as any, "w1", "intruder")
    ).rejects.toThrow("Access denied")
  })
})

