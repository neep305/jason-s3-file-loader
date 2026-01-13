const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

console.log('[API] API_BASE_URL:', API_BASE_URL)
console.log('[API] Environment:', import.meta.env.MODE)

async function handleResponse(response, defaultMessage) {
  const contentType = response.headers.get('content-type') || ''
  const text = await response.text()

  const tryParseJson = (payload) => {
    try {
      return JSON.parse(payload)
    } catch {
      return null
    }
  }

  if (response.ok) {
    if (!text) return {}
    if (contentType.includes('application/json')) {
      const parsed = tryParseJson(text)
      return parsed ?? { raw: text }
    }
    return { raw: text }
  }

  let errorDetail = defaultMessage

  if (contentType.includes('application/json')) {
    const parsed = tryParseJson(text)
    if (parsed) {
      errorDetail = parsed.detail || parsed.message || JSON.stringify(parsed)
    }
  } else if (text) {
    errorDetail = text
  }

  const statusText = response.statusText || 'Error'
  throw new Error(`HTTP ${response.status} ${statusText} - ${errorDetail}`)
}

export async function uploadFile(file, bucketName, uploadPath, awsAccessKey, awsSecretKey) {
  const formData = new FormData()
  formData.append('file', file)
  if (bucketName) formData.append('bucket_name', bucketName)
  if (uploadPath) formData.append('upload_path', uploadPath)
  
  const headers = {}
  if (awsAccessKey && awsSecretKey) {
    headers['X-AWS-Access-Key'] = awsAccessKey
    headers['X-AWS-Secret-Key'] = awsSecretKey
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    })
    return await handleResponse(response, 'Upload failed')
  } catch (error) {
    throw error
  }
}

export async function getBuckets(awsAccessKey, awsSecretKey) {
  const headers = {}
  if (awsAccessKey && awsSecretKey) {
    headers['X-AWS-Access-Key'] = awsAccessKey
    headers['X-AWS-Secret-Key'] = awsSecretKey
  }
  
  console.log('[getBuckets] Calling API with URL:', `${API_BASE_URL}/buckets`)
  console.log('[getBuckets] Headers:', { 
    hasAccessKey: !!headers['X-AWS-Access-Key'],
    hasSecretKey: !!headers['X-AWS-Secret-Key']
  })
  
  try {
    const response = await fetch(`${API_BASE_URL}/buckets`, { headers })
    console.log('[getBuckets] Response status:', response.status, response.statusText)
    const result = await handleResponse(response, 'Failed to fetch buckets')
    console.log('[getBuckets] Parsed result:', result)
    return result
  } catch (error) {
    console.error('[getBuckets] Error:', error)
    throw error
  }
}

export async function getBucketObjects(bucketName, prefix = '', awsAccessKey, awsSecretKey) {
  const headers = {}
  if (awsAccessKey && awsSecretKey) {
    headers['X-AWS-Access-Key'] = awsAccessKey
    headers['X-AWS-Secret-Key'] = awsSecretKey
  }
  
  try {
    const url = new URL(`${API_BASE_URL}/buckets/${bucketName}/objects`)
    if (prefix) url.searchParams.set('prefix', prefix)
    
    const response = await fetch(url.toString(), { headers })
    return await handleResponse(response, 'Failed to fetch bucket objects')
  } catch (error) {
    throw error
  }
}

export async function getConfig() {
  try {
    const response = await fetch(`${API_BASE_URL}/config`)
    return await handleResponse(response, 'Failed to fetch config')
  } catch (error) {
    throw error
  }
}

export async function downloadFile(bucketName, fileKey, awsAccessKey, awsSecretKey) {
  const headers = {}
  if (awsAccessKey && awsSecretKey) {
    headers['X-AWS-Access-Key'] = awsAccessKey
    headers['X-AWS-Secret-Key'] = awsSecretKey
  }
  
  try {
    const url = new URL(`${API_BASE_URL}/download/${bucketName}/${fileKey}`)
    
    const response = await fetch(url.toString(), { 
      headers,
      method: 'GET'
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      const message = text || 'Failed to download file'
      throw new Error(`HTTP ${response.status} ${response.statusText || ''} - ${message}`)
    }
    return response
  } catch (error) {
    throw error
  }
}

export async function deleteFiles(bucketName, fileKeys, awsAccessKey, awsSecretKey) {
  const headers = {
    'Content-Type': 'application/json'
  }
  if (awsAccessKey && awsSecretKey) {
    headers['X-AWS-Access-Key'] = awsAccessKey
    headers['X-AWS-Secret-Key'] = awsSecretKey
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/delete/${bucketName}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify(fileKeys)
    })
    return await handleResponse(response, 'Failed to delete files')
  } catch (error) {
    throw error
  }
}
