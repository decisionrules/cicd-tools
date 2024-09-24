
/**
 * Destination space management api key. It identifies DecisionRules space
 * @type {string}
 */
const DEST_SPACE_MANAGEMENT_APIKEY = process.env.DEST_SPACE_MANAGEMENT_APIKEY;

/**
 * Source DecisionRules environment url. Example: // example: https://api.decisionrules.io
 * @type {string}
 */
const DEST_ENV_URL = process.env.DEST_ENV_URL;


// START
(async () => {
    const args = process.argv.slice(2);
    const importFilePath = args[0]

    if (!importFilePath) {
        console.log('Please specify file to import.')
    } else {
        console.log('Importing from file:', importFilePath)
    }

    if (!DEST_ENV_URL) {
        console.error("Set ENV variable SOURCE_ENV_URL. Example: https://api.decisionrules.io");
        return
    }

    if (!DEST_SPACE_MANAGEMENT_APIKEY) {
        console.error("Set ENV variable SOURCE_SPACE_APIKEY.");
        return
    }

    const rf= await import('fs/promises');
    const jsonString = ((await rf.readFile(importFilePath)).toString('utf8'))

    return await importSpace(DEST_SPACE_MANAGEMENT_APIKEY, jsonString);
})();



async function importSpace(destinationSpaceApiKey, importJsonData) {
    // Create URL
    try {
        const url = `${DEST_ENV_URL}/api/folder/`;

        // Export old Space contents
        const importResponse = await fetch(url + 'import/root', {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${destinationSpaceApiKey}`,
                "Content-Type": "application/json"
            },
            body: importJsonData
        })





        const createdFolderIdObject = await importResponse.json()
        const createdFolderId = createdFolderIdObject.folderNode
        console.log(createdFolderIdObject)

        // Get Folder Structure of created Node
        const folderStructureResponse = await fetch(url + createdFolderId, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${destinationSpaceApiKey}`,
                "Content-Type": "application/json"
            }
        })

        console.log('get folder structure DONE')
        // Convert response to json
        const FolderStructure = await folderStructureResponse.json()

        // Move all folders from the "Home (Imported)" folder
        // out to the root to maintain Folder Structure

        // Prepare Move request
        const nodesToMove = FolderStructure.children
        nodesToMove.forEach(child => {
            delete child.name
            delete child.children
            delete child.baseId
        })
        const moveRequest = {
            targetId: 'root',
            nodes: nodesToMove
        }
        // Move the nodes
        await fetch(url + 'move', {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${destinationSpaceApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(moveRequest)
        })

        // Delete the empty "Home" folder
        await fetch(url + `${createdFolderId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${destinationSpaceApiKey}`,
                "Content-Type": "application/json"
            },
        })
        console.log('Migration Completed Successfully')

        return 0
    }
    catch(e) {
        console.error(`Error occurred during migration: ${e.message}`)
        return -1
    }
}


