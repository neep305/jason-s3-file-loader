import React, { useState, useRef, useEffect } from 'react'
import { uploadFile, getConfig, getBuckets, getBucketObjects, downloadFile, deleteFiles } from '../utils/api'

export function FileUpload() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [config, setConfig] = useState(null)
  
  // AWS Credentials state
  const [awsAccessKey, setAwsAccessKey] = useState('')
  const [awsSecretKey, setAwsSecretKey] = useState('')
  const [credentialsRegistered, setCredentialsRegistered] = useState(false)
  const [showCredentialsForm, setShowCredentialsForm] = useState(false)
  
  // S3 related state
  const [buckets, setBuckets] = useState([])
  const [selectedBucket, setSelectedBucket] = useState('')
  const [currentPath, setCurrentPath] = useState('')
  const [pathHistory, setPathHistory] = useState([])
  const [bucketObjects, setBucketObjects] = useState({ folders: [], files: [] })
  const [loadingBuckets, setLoadingBuckets] = useState(false)
  const [loadingObjects, setLoadingObjects] = useState(false)
  
  // File selection state
  const [selectedFiles, setSelectedFiles] = useState([])
  const [downloadingFiles, setDownloadingFiles] = useState([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  
  
  const fileInputRef = useRef(null)

  useEffect(() => {
    // Load AWS credentials from localStorage
    const savedAccessKey = localStorage.getItem('awsAccessKey')
    const savedSecretKey = localStorage.getItem('awsSecretKey')
    
    if (savedAccessKey && savedSecretKey) {
      setAwsAccessKey(savedAccessKey)
      setAwsSecretKey(savedSecretKey)
      setCredentialsRegistered(true)
      setShowCredentialsForm(false)
    } else {
      setShowCredentialsForm(true)
    }
    
    getConfig()
      .then(setConfig)
      .catch(err => {
        console.warn('Config loading failed, using defaults:', err.message)
        // Set default config values
        setConfig({
          max_file_size: 5 * 1024 * 1024 * 1024, // 5GB
          max_file_size_mb: 5120, // 5GB in MB
          allowed_mime_types: [
            "image/jpeg", "image/png", "image/gif",
            "application/pdf", "text/plain",
            "application/json", "application/octet-stream",
            "text/csv", "text/markdown"
          ],
          aws_region: "us-east-1"
        })
      })
  }, [])

  useEffect(() => {
    if (credentialsRegistered) {
      loadBuckets()
    }
  }, [credentialsRegistered])

  const handleRegisterCredentials = () => {
    if (!awsAccessKey.trim() || !awsSecretKey.trim()) {
      setError('Please enter both AWS Access Key and Secret Key')
      return
    }
    
    // Save to localStorage
    localStorage.setItem('awsAccessKey', awsAccessKey.trim())
    localStorage.setItem('awsSecretKey', awsSecretKey.trim())
    
    setCredentialsRegistered(true)
    setShowCredentialsForm(false)
    setError(null)
  }

  const handleResetCredentials = () => {
    // Clear localStorage
    localStorage.removeItem('awsAccessKey')
    localStorage.removeItem('awsSecretKey')
    
    // Reset state
    setAwsAccessKey('')
    setAwsSecretKey('')
    setCredentialsRegistered(false)
    setShowCredentialsForm(true)
    setBuckets([])
    setSelectedBucket('')
    setCurrentPath('')
    setPathHistory([])
    setBucketObjects({ folders: [], files: [] })
    setError(null)
    setResult(null)
  }

  const loadBuckets = async () => {
    if (!credentialsRegistered) return
    
    setLoadingBuckets(true)
    try {
      const response = await getBuckets(awsAccessKey, awsSecretKey)
      setBuckets(response.buckets || [])
      if (response.buckets?.length > 0) {
        setSelectedBucket(response.buckets[0].name)
        loadBucketObjects(response.buckets[0].name)
      }
    } catch (err) {
      setError(`Failed to load buckets: ${err.message}`)
    } finally {
      setLoadingBuckets(false)
    }
  }

  const loadBucketObjects = async (bucketName, prefix = '') => {
    if (!bucketName || !credentialsRegistered) return
    
    setLoadingObjects(true)
    setSelectedFiles([]) // Clear selection when loading new objects
    try {
      const objects = await getBucketObjects(bucketName, prefix, awsAccessKey, awsSecretKey)
      setBucketObjects(objects)
      setCurrentPath(prefix)
    } catch (err) {
      setError(`Failed to load bucket contents: ${err.message}`)
    } finally {
      setLoadingObjects(false)
    }
  }

  const handleBucketChange = (bucketName) => {
    setSelectedBucket(bucketName)
    setCurrentPath('')
    setPathHistory([])
    loadBucketObjects(bucketName)
  }

  const handleFolderClick = (folderPrefix) => {
    setPathHistory([...pathHistory, currentPath])
    loadBucketObjects(selectedBucket, folderPrefix)
  }

  const handleGoBack = () => {
    if (pathHistory.length > 0) {
      const previousPath = pathHistory[pathHistory.length - 1]
      setPathHistory(pathHistory.slice(0, -1))
      loadBucketObjects(selectedBucket, previousPath)
    }
  }

  const handleFileSelection = (fileKey, isSelected) => {
    if (isSelected) {
      setSelectedFiles(prev => [...prev, fileKey])
    } else {
      setSelectedFiles(prev => prev.filter(key => key !== fileKey))
    }
  }

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedFiles(bucketObjects.files.map(file => file.key))
    } else {
      setSelectedFiles([])
    }
  }

  const handleDownloadSelectedFiles = async () => {
    if (selectedFiles.length === 0) return

    setDownloadingFiles(selectedFiles)
    setError(null)

    try {
      for (const fileKey of selectedFiles) {
        try {
          const response = await downloadFile(selectedBucket, fileKey, awsAccessKey, awsSecretKey)
          
          // Create download link
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = fileKey.split('/').pop()
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
          
          // Remove from downloading list
          setDownloadingFiles(prev => prev.filter(key => key !== fileKey))
        } catch (error) {
          console.error(`Failed to download ${fileKey}:`, error)
          setDownloadingFiles(prev => prev.filter(key => key !== fileKey))
        }
      }
      
      setSelectedFiles([])
    } catch (error) {
      setError(`Download failed: ${error.message}`)
      setDownloadingFiles([])
    }
  }

  const handleDeleteSelectedFiles = () => {
    if (selectedFiles.length === 0) return
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (deleteConfirmation !== 'delete') {
      setError('Please type "delete" to confirm')
      return
    }

    try {
      const result = await deleteFiles(selectedBucket, selectedFiles, awsAccessKey, awsSecretKey)
      
      if (result.success) {
        setSelectedFiles([])
        setShowDeleteModal(false)
        setDeleteConfirmation('')
        
        // Reload bucket objects
        loadBucketObjects(selectedBucket, currentPath)
        
        if (result.failed && result.failed.length > 0) {
          setError(`Some files failed to delete: ${result.failed.map(f => f.key).join(', ')}`)
        }
      } else {
        setError('Delete operation failed')
      }
    } catch (error) {
      setError(`Delete failed: ${error.message}`)
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setResult(null)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file')
      return
    }
    if (!selectedBucket) {
      setError('Please select a bucket')
      return
    }
    if (!credentialsRegistered) {
      setError('Please register AWS credentials first')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setError(null)
    setResult(null)

    try {
      // Simulate progress for demo (in real implementation, use XMLHttpRequest for actual progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await uploadFile(file, selectedBucket, currentPath, awsAccessKey, awsSecretKey)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      setResult(response)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // Reload current directory to show uploaded file
      setTimeout(() => loadBucketObjects(selectedBucket, currentPath), 1000)
    } catch (err) {
      setError(err.message || 'Upload failed')
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const formatPath = (path) => {
    if (!path) return 'Root'
    return path.split('/').filter(p => p).join(' / ')
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">AWS S3 File Uploader</h1>

      {/* AWS Credentials Section */}
      <div className="mb-6 p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">AWS Credentials</h2>
          {credentialsRegistered && (
            <button
              onClick={handleResetCredentials}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition"
            >
              초기화
            </button>
          )}
        </div>

        {showCredentialsForm ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AWS Access Key ID
              </label>
              <input
                type="text"
                value={awsAccessKey}
                onChange={(e) => setAwsAccessKey(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your AWS Access Key ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AWS Secret Access Key
              </label>
              <input
                type="password"
                value={awsSecretKey}
                onChange={(e) => setAwsSecretKey(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your AWS Secret Access Key"
              />
            </div>
            <button
              onClick={handleRegisterCredentials}
              className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition"
            >
              등록
            </button>
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            <p>✅ AWS credentials are registered and saved locally</p>
            <p className="mt-1">Access Key: {awsAccessKey.substring(0, 8)}...</p>
          </div>
        )}
      </div>

      {config && (
        <div className="mb-4 p-3 bg-blue-50 rounded text-sm text-gray-700">
          <p>Max file size: {(config.max_file_size_mb || 0).toFixed(0)} MB</p>
        </div>
      )}

      {/* Bucket Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select S3 Bucket
        </label>
        <select
          value={selectedBucket}
          onChange={(e) => handleBucketChange(e.target.value)}
          disabled={loadingBuckets}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {loadingBuckets ? (
            <option>Loading buckets...</option>
          ) : (
            buckets.map(bucket => (
              <option key={bucket.name} value={bucket.name}>
                {bucket.name}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Current Path Navigation */}
      <div className="mb-4 flex items-center space-x-2">
        <button
          onClick={handleGoBack}
          disabled={pathHistory.length === 0}
          className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          ← Back
        </button>
        <span className="text-sm text-gray-600">
          Current path: {formatPath(currentPath)}
        </span>
      </div>

      {/* Bucket Contents */}
      <div className="mb-6 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Contents</h3>
          
          {bucketObjects.files?.length > 0 && (
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-1 text-sm">
                <input
                  type="checkbox"
                  checked={selectedFiles.length === bucketObjects.files.length && bucketObjects.files.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded"
                />
                <span>Select All</span>
              </label>
              
              {selectedFiles.length > 0 && (
                <div className="flex space-x-2">
                  <button
                    onClick={handleDownloadSelectedFiles}
                    disabled={downloadingFiles.length > 0}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-blue-300"
                  >
                    {downloadingFiles.length > 0 ? 'Downloading...' : `Download (${selectedFiles.length})`}
                  </button>
                  <button
                    onClick={handleDeleteSelectedFiles}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                  >
                    Delete ({selectedFiles.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {loadingObjects ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div className="space-y-2">
            {bucketObjects.folders?.map(folder => (
              <div
                key={folder.prefix}
                onClick={() => handleFolderClick(folder.prefix)}
                className="flex items-center space-x-2 p-2 hover:bg-gray-50 cursor-pointer rounded"
              >
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5a2 2 0 012 2v2H2V6zM2 10h10v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                </svg>
                <span className="text-sm">{folder.name}/</span>
              </div>
            ))}
            
            {bucketObjects.files?.map(file => (
              <div key={file.key} className="flex items-center space-x-2 p-2">
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(file.key)}
                  onChange={(e) => handleFileSelection(file.key, e.target.checked)}
                  className="rounded"
                />
                <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4z"/>
                </svg>
                <span className="text-sm">{file.name}</span>
                <span className="text-xs text-gray-500 ml-auto">
                  {(file.size / 1024).toFixed(1)} KB
                  {downloadingFiles.includes(file.key) && (
                    <span className="ml-2 text-blue-500">Downloading...</span>
                  )}
                </span>
              </div>
            ))}
            
            {bucketObjects.folders?.length === 0 && bucketObjects.files?.length === 0 && (
              <p className="text-gray-500 text-sm">No files or folders in this location</p>
            )}
          </div>
        )}
      </div>

      {/* File Upload Form */}
      <form onSubmit={handleUpload} className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-gray-400 transition">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input" className="cursor-pointer">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-8-12v8m0 0l-3-3m3 3l3-3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="mt-2 text-sm font-medium text-gray-700">
                {file ? file.name : 'Click or drag to select file'}
              </p>
            </div>
          </label>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}

        <button
          type="submit"
          disabled={!file || uploading || !selectedBucket}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {uploading ? `Uploading... ${uploadProgress}%` : 'Upload File'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="font-medium text-green-700 mb-2">Upload Successful!</p>
          <div className="text-sm text-gray-700 space-y-1">
            <p><span className="font-medium">File:</span> {result.file_key?.split('/').pop()}</p>
            <p><span className="font-medium">Bucket:</span> {selectedBucket}</p>
            <p><span className="font-medium">Path:</span> {formatPath(currentPath)}</p>
            <p><span className="font-medium">Request ID:</span> {result.request_id}</p>
            {result.presigned_url && (
              <a
                href={result.presigned_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 block mt-2"
              >
                View file →
              </a>
            )}
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">삭제 확인</h3>
            <p className="text-gray-600 mb-4">
              {selectedFiles.length}개의 파일을 삭제하시겠습니까?
            </p>
            <p className="text-gray-600 mb-4">
              삭제를 원하시면 아래 입력창에 <strong>delete</strong>를 입력 후 확인 버튼을 누르세요.
            </p>
            <div className="mb-4">
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="delete"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmation('')
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteConfirmation !== 'delete'}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
