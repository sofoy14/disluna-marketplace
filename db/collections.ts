// STUB FILE - Temporarily created to prevent build errors
// TODO: This redirects to processes
export * from "./processes"

export const getCollectionWorkspacesByWorkspaceId = async (workspaceId: string) => {
  const { getProcessWorkspacesByWorkspaceId } = await import("./processes")
  const result = await getProcessWorkspacesByWorkspaceId(workspaceId)
  return { collections: result.processes || [] }
}

export const updateCollection = async (id: string, data: any) => {
  const { updateProcess } = await import("./processes")
  return await updateProcess(id, data)
}

export const createCollection = async (data: any, workspaceId: string) => {
  const { createProcess } = await import("./processes")
  return await createProcess(data, workspaceId)
}

export const getCollectionById = async (id: string) => {
  const { getProcessById } = await import("./processes")
  return await getProcessById(id)
}

export const deleteCollection = async (id: string) => {
  const { deleteProcess } = await import("./processes")
  return await deleteProcess(id)
}

export const getCollectionWorkspacesByCollectionId = async (collectionId: string) => {
  return []
}

export const deleteCollectionWorkspace = async (workspaceId: string, collectionId: string) => {
  return
}

export const createCollectionWorkspaces = async (items: any[], workspaceId: string) => {
  return []
}

