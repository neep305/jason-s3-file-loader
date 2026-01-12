const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Upload failed')
    }
    
    return await response.json()
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
  
  try {
    const response = await fetch(`${API_BASE_URL}/buckets`, { headers })
    if (!response.ok) throw new Error('Failed to fetch buckets')
    return await response.json()
  } catch (error) {
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
    if (!response.ok) throw new Error('Failed to fetch bucket objects')
    return await response.json()
  } catch (error) {
    throw error
  }
}

export async function getConfig() {
  try {
    const response = await fetch(`${API_BASE_URL}/config`)
    if (!response.ok) throw new Error('Failed to fetch config')
    return await response.json()
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
    if (!response.ok) throw new Error('Failed to download file')
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
    if (!response.ok) throw new Error('Failed to delete files')
    return await response.json()
  } catch (error) {
    throw error
  }
}
