// STUB FILE - Temporarily created to prevent build errors
// TODO: This redirects to process-files
export * from "./process-files"

export const getCollectionFilesByCollectionId = async (collectionId: string) => {
  const { getProcessFilesByProcessId } = await import("./process-files")
  const result = await getProcessFilesByProcessId(collectionId)
  return { files: result.files || [] }
}

export const createCollectionFile = async (data: any) => {
  const { createProcessFile } = await import("./process-files")
  return await createProcessFile(data)
}

export const createCollectionFiles = async (dataArray: any[]) => {
  const { createProcessFile } = await import("./process-files")
  const results = []
  for (const data of dataArray) {
    results.push(await createProcessFile(data))
  }
  return results
}

export const deleteCollectionFile = async (collectionId: string, fileId: string) => {
  const { deleteProcessFile } = await import("./process-files")
  return await deleteProcessFile(collectionId, fileId)
}

