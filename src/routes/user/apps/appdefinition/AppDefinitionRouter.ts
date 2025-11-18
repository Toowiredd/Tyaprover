import express = require('express')
import ApiStatusCodes from '../../../../api/ApiStatusCodes'
import BaseApi from '../../../../api/BaseApi'
import InjectionExtractor from '../../../../injection/InjectionExtractor'
import { AppDeployTokenConfig, IAppDef } from '../../../../models/AppDefinition'
import { ICaptainDefinition } from '../../../../models/ICaptainDefinition'
import { CaptainError } from '../../../../models/OtherTypes'
import CaptainManager from '../../../../user/system/CaptainManager'
import CaptainConstants from '../../../../utils/CaptainConstants'
import Logger from '../../../../utils/Logger'
import Utils from '../../../../utils/Utils'

const router = express.Router()

// BUG FIX #1: Track apps currently being updated to prevent race conditions
const appsBeingUpdated = new Set<string>()

// unused images
router.get('/unusedImages', function (req, res, next) {
    return Promise.resolve()
        .then(function () {
            const mostRecentLimit = Number(req.query.mostRecentLimit || '0')
            return CaptainManager.get()
                .getDiskCleanupManager()
                .getUnusedImages(mostRecentLimit)
        })
        .then(function (unusedImages) {
            const baseApi = new BaseApi(
                ApiStatusCodes.STATUS_OK,
                'Unused images retrieved.'
            )
            baseApi.data = {}
            baseApi.data.unusedImages = unusedImages

            res.send(baseApi)
        })
        .catch(ApiStatusCodes.createCatcher(res))
})

// delete images
router.post('/deleteImages', function (req, res, next) {
    const imageIds = req.body.imageIds || []

    return Promise.resolve()
        .then(function () {
            return CaptainManager.get()
                .getDiskCleanupManager()
                .deleteImages(imageIds)
        })
        .then(function () {
            const baseApi = new BaseApi(
                ApiStatusCodes.STATUS_OK,
                'Images Deleted.'
            )
            res.send(baseApi)
        })
        .catch(ApiStatusCodes.createCatcher(res))
})

// Get All App Definitions
router.get('/', function (req, res, next) {
    const dataStore =
        InjectionExtractor.extractUserFromInjected(res).user.dataStore
    const serviceManager =
        InjectionExtractor.extractUserFromInjected(res).user.serviceManager
    const appsArray: IAppDef[] = []

    return dataStore
        .getAppsDataStore()
        .getAppDefinitions()
        .then(function (apps) {
            const promises: Promise<void>[] = []

            Object.keys(apps).forEach(function (key, index) {
                const app = apps[key]
                app.appName = key
                app.isAppBuilding = serviceManager.isAppBuilding(key)
                app.appPushWebhook = app.appPushWebhook || undefined
                appsArray.push(app)
            })

            return Promise.all(promises)
        })
        .then(function () {
            return dataStore.getDefaultAppNginxConfig()
        })
        .then(function (defaultNginxConfig) {
            const baseApi = new BaseApi(
                ApiStatusCodes.STATUS_OK,
                'App definitions are retrieved.'
            )
            baseApi.data = {
                appDefinitions: appsArray,
                rootDomain: dataStore.getRootDomain(),
                captainSubDomain: CaptainConstants.configs.captainSubDomain,
                defaultNginxConfig: defaultNginxConfig,
            }

            res.send(baseApi)
        })
        .catch(ApiStatusCodes.createCatcher(res))
})

router.post('/enablebasedomainssl/', function (req, res, next) {
    const serviceManager =
        InjectionExtractor.extractUserFromInjected(res).user.serviceManager

    const appName = req.body.appName

    return Promise.resolve()
        .then(function () {
            return serviceManager.enableSslForApp(appName)
        })
        .then(function () {
            const msg = `General SSL is enabled for: ${appName}`
            Logger.d(msg)
            res.send(new BaseApi(ApiStatusCodes.STATUS_OK, msg))
        })
        .catch(ApiStatusCodes.createCatcher(res))
})

router.post('/customdomain/', function (req, res, next) {
    const serviceManager =
        InjectionExtractor.extractUserFromInjected(res).user.serviceManager

    const appName = req.body.appName
    const customDomain = (req.body.customDomain || '').toLowerCase().trim()

    // verify customdomain.com going through the default NGINX
    // Add customdomain.com to app in Data Store

    return Promise.resolve()
        .then(function () {
            return serviceManager.addCustomDomain(appName, customDomain)
        })
        .then(function () {
            const msg = `Custom domain is enabled for: ${appName} at ${customDomain}`
            Logger.d(msg)
            res.send(new BaseApi(ApiStatusCodes.STATUS_OK, msg))
        })
        .catch(ApiStatusCodes.createCatcher(res))
})

router.post('/removecustomdomain/', function (req, res, next) {
    const serviceManager =
        InjectionExtractor.extractUserFromInjected(res).user.serviceManager

    const appName = req.body.appName
    const customDomain = (req.body.customDomain || '').toLowerCase()

    return Promise.resolve()
        .then(function () {
            return serviceManager.removeCustomDomain(appName, customDomain)
        })
        .then(function () {
            const msg = `Custom domain is removed for: ${appName} at ${customDomain}`
            Logger.d(msg)
            res.send(new BaseApi(ApiStatusCodes.STATUS_OK, msg))
        })
        .catch(ApiStatusCodes.createCatcher(res))
})

router.post('/enablecustomdomainssl/', function (req, res, next) {
    const serviceManager =
        InjectionExtractor.extractUserFromInjected(res).user.serviceManager

    const appName = req.body.appName
    const customDomain = (req.body.customDomain || '').toLowerCase()

    // Check if customdomain is already associated with app. If not, error out.
    // Verify customdomain.com is served from /customdomain.com/

    return Promise.resolve()
        .then(function () {
            return serviceManager.enableCustomDomainSsl(appName, customDomain)
        })
        .then(function () {
            const msg = `Custom domain SSL is enabled for: ${appName} at ${customDomain} `
            Logger.d(msg)
            res.send(new BaseApi(ApiStatusCodes.STATUS_OK, msg))
        })
        .catch(ApiStatusCodes.createCatcher(res))
})

router.post('/register/', function (req, res, next) {
    const dataStore =
        InjectionExtractor.extractUserFromInjected(res).user.dataStore
    const serviceManager =
        InjectionExtractor.extractUserFromInjected(res).user.serviceManager

    const appName = req.body.appName as string
    const projectId = `${req.body.projectId || ''}`
    const hasPersistentData = !!req.body.hasPersistentData
    const isDetachedBuild = !!req.query.detached

    let appCreated = false
    let serviceCreated = false

    Logger.d(`Registering app started: ${appName}`)

    return Promise.resolve()
        .then(function () {
            // BUG FIX #4: Validate app name is not empty and contains valid characters
            if (!appName || appName.trim().length === 0) {
                throw ApiStatusCodes.createError(
                    ApiStatusCodes.STATUS_ERROR_BAD_NAME,
                    'App name is required and cannot be empty'
                )
            }

            // Validate app name format (alphanumeric, dash, underscore only)
            if (!/^[a-z0-9-_]+$/i.test(appName)) {
                throw ApiStatusCodes.createError(
                    ApiStatusCodes.STATUS_ERROR_BAD_NAME,
                    'App name can only contain letters, numbers, dashes, and underscores'
                )
            }

            if (projectId) {
                return dataStore.getProjectsDataStore().getProject(projectId)
                // if project is not found, it will throw an error
            }
        })
        .then(function () {
            return dataStore
                .getAppsDataStore()
                .registerAppDefinition(appName, projectId, hasPersistentData)
        })
        .then(function () {
            appCreated = true
        })
        .then(function () {
            const captainDefinitionContent: ICaptainDefinition = {
                schemaVersion: 2,
                imageName: CaptainConstants.configs.appPlaceholderImageName,
            }

            const promiseToIgnore = serviceManager
                .scheduleDeployNewVersion(appName, {
                    captainDefinitionContentSource: {
                        captainDefinitionContent: JSON.stringify(
                            captainDefinitionContent
                        ),
                        gitHash: '',
                    },
                })
                .then(function () {
                    serviceCreated = true
                })
                .catch(function (error) {
                    Logger.e(error)
                    throw error // BUG FIX #3: Propagate error to trigger rollback
                })

            if (!isDetachedBuild) return promiseToIgnore
        })
        .then(function () {
            Logger.d(`AppName is saved: ${appName}`)
            res.send(
                new BaseApi(ApiStatusCodes.STATUS_OK, 'App Definition Saved')
            )
        })
        .catch(function (error: CaptainError) {
            function createRejectionPromise() {
                return new Promise<void>(function (resolve, reject) {
                    reject(error)
                })
            }

            // BUG FIX #3: Complete rollback - remove both datastore and Docker service
            if (appCreated) {
                const promises: Promise<any>[] = []

                // Remove from datastore
                promises.push(
                    dataStore
                        .getAppsDataStore()
                        .deleteAppDefinition(appName)
                        .catch(function (err) {
                            Logger.e(`Failed to delete app definition during rollback: ${err}`)
                        })
                )

                // Remove Docker service if it was created
                if (serviceCreated) {
                    promises.push(
                        serviceManager
                            .removeApps([appName])
                            .catch(function (err) {
                                Logger.e(`Failed to remove Docker service during rollback: ${err}`)
                            })
                    )
                }

                return Promise.all(promises)
                    .then(function () {
                        return createRejectionPromise()
                    })
            } else {
                return createRejectionPromise()
            }
        })
        .catch(ApiStatusCodes.createCatcher(res))
})

router.post('/delete/', function (req, res, next) {
    const serviceManager =
        InjectionExtractor.extractUserFromInjected(res).user.serviceManager

    const appName: string = req.body.appName
    const volumes: string[] = req.body.volumes || []
    const appNames: string[] = req.body.appNames || []
    const appsToDelete: string[] = appNames.length ? appNames : [appName]

    Logger.d(`Deleting app started: ${appName}`)

    return Promise.resolve()
        .then(function () {
            if (appNames.length > 0 && appName) {
                throw ApiStatusCodes.createError(
                    ApiStatusCodes.ILLEGAL_OPERATION,
                    'Either appName or appNames should be provided'
                )
            }

            // BUG FIX #9: Check if any app is currently building before deletion
            for (const app of appsToDelete) {
                if (serviceManager.isAppBuilding(app)) {
                    throw ApiStatusCodes.createError(
                        ApiStatusCodes.ILLEGAL_OPERATION,
                        `Cannot delete app '${app}' while a build is in progress. Please wait for the build to complete or cancel it first.`
                    )
                }
            }
        })
        .then(function () {
            return serviceManager.removeApps(appsToDelete)
        })
        .then(function () {
            return Utils.getDelayedPromise(volumes.length ? 12000 : 0)
        })
        .then(function () {
            return serviceManager.removeVolsSafe(volumes)
        })
        .then(function (failedVolsToRemoved) {
            Logger.d(`Successfully deleted: ${appsToDelete.join(', ')}`)

            if (failedVolsToRemoved.length) {
                const returnVal = new BaseApi(
                    ApiStatusCodes.STATUS_OK_PARTIALLY,
                    `App is deleted. Some volumes were not safe to delete. Delete skipped for: ${failedVolsToRemoved.join(
                        ' , '
                    )}`
                )
                returnVal.data = { volumesFailedToDelete: failedVolsToRemoved }
                res.send(returnVal)
            } else {
                res.send(
                    new BaseApi(ApiStatusCodes.STATUS_OK, 'App is deleted')
                )
            }
        })
        .catch(ApiStatusCodes.createCatcher(res))
})

router.post('/rename/', function (req, res, next) {
    const serviceManager =
        InjectionExtractor.extractUserFromInjected(res).user.serviceManager

    const oldAppName = req.body.oldAppName + ''
    const newAppName = req.body.newAppName + ''

    Logger.d(`Renaming app started: From ${oldAppName} To ${newAppName} `)

    return Promise.resolve()
        .then(function () {
            return serviceManager.renameApp(oldAppName, newAppName)
        })
        .then(function () {
            Logger.d('AppName is renamed')
            res.send(
                new BaseApi(ApiStatusCodes.STATUS_OK, 'AppName is renamed')
            )
        })
        .catch(ApiStatusCodes.createCatcher(res))
})

router.post('/update/', function (req, res, next) {
    const serviceManager =
        InjectionExtractor.extractUserFromInjected(res).user.serviceManager

    const appName = req.body.appName
    const projectId = req.body.projectId
    const nodeId = req.body.nodeId
    const captainDefinitionRelativeFilePath =
        req.body.captainDefinitionRelativeFilePath
    const notExposeAsWebApp = req.body.notExposeAsWebApp
    const tags = req.body.tags || []
    const customNginxConfig = req.body.customNginxConfig
    const forceSsl = !!req.body.forceSsl
    const websocketSupport = !!req.body.websocketSupport
    const repoInfo = req.body.appPushWebhook
        ? req.body.appPushWebhook.repoInfo || {}
        : {}
    const envVars = req.body.envVars || []
    const volumes = req.body.volumes || []
    const ports = req.body.ports || []
    const instanceCount = req.body.instanceCount || '0'
    const redirectDomain = req.body.redirectDomain || ''
    const preDeployFunction = req.body.preDeployFunction || ''
    const serviceUpdateOverride = req.body.serviceUpdateOverride || ''
    const containerHttpPort = Number(req.body.containerHttpPort) || 80
    const httpAuth = req.body.httpAuth
    let appDeployTokenConfig = req.body.appDeployTokenConfig as
        | AppDeployTokenConfig
        | undefined
    const description = req.body.description || ''

    // BUG FIX #4: Validate instance count
    const instanceCountNum = Number(instanceCount)
    if (isNaN(instanceCountNum) || instanceCountNum < 0) {
        res.send(
            new BaseApi(
                ApiStatusCodes.ILLEGAL_PARAMETER,
                'Instance count must be a non-negative number'
            )
        )
        return
    }
    if (instanceCountNum > 100) {
        res.send(
            new BaseApi(
                ApiStatusCodes.ILLEGAL_PARAMETER,
                'Instance count cannot exceed 100. Please contact support if you need more instances.'
            )
        )
        return
    }

    // BUG FIX #5: Validate environment variables structure
    if (envVars && Array.isArray(envVars)) {
        for (let i = 0; i < envVars.length; i++) {
            const envVar = envVars[i]
            if (!envVar || typeof envVar !== 'object') {
                res.send(
                    new BaseApi(
                        ApiStatusCodes.ILLEGAL_PARAMETER,
                        `Environment variable at index ${i} must be an object with 'key' and 'value' properties`
                    )
                )
                return
            }
            if (!envVar.key || typeof envVar.key !== 'string') {
                res.send(
                    new BaseApi(
                        ApiStatusCodes.ILLEGAL_PARAMETER,
                        `Environment variable at index ${i} is missing required 'key' property or key is not a string`
                    )
                )
                return
            }
            if (envVar.value === undefined || envVar.value === null) {
                res.send(
                    new BaseApi(
                        ApiStatusCodes.ILLEGAL_PARAMETER,
                        `Environment variable at index ${i} (key: '${envVar.key}') is missing required 'value' property`
                    )
                )
                return
            }
        }
    }

    if (!appDeployTokenConfig) {
        appDeployTokenConfig = { enabled: false }
    } else {
        appDeployTokenConfig = {
            enabled: !!appDeployTokenConfig.enabled,
            appDeployToken: `${
                appDeployTokenConfig.appDeployToken
                    ? appDeployTokenConfig.appDeployToken
                    : ''
            }`.trim(),
        }
    }

    if (repoInfo.user) {
        repoInfo.user = repoInfo.user.trim()
    }
    if (repoInfo.repo) {
        repoInfo.repo = repoInfo.repo.trim()
    }
    if (repoInfo.branch) {
        repoInfo.branch = repoInfo.branch.trim()
    }

    // BUG FIX #7: Improved Git webhook validation with specific error messages
    if (
        repoInfo.branch ||
        repoInfo.user ||
        repoInfo.repo ||
        repoInfo.password ||
        repoInfo.sshKey
    ) {
        // At least one Git field is provided, validate all required fields
        const missingFields: string[] = []

        if (!repoInfo.branch) {
            missingFields.push('branch')
        }
        if (!repoInfo.repo) {
            missingFields.push('repo')
        }

        // Need either SSH key OR username+password
        const hasSshKey = !!repoInfo.sshKey
        const hasUserPass = !!repoInfo.user && !!repoInfo.password

        if (!hasSshKey && !hasUserPass) {
            if (!repoInfo.sshKey && !repoInfo.user && !repoInfo.password) {
                missingFields.push('authentication (either sshKey OR user+password)')
            } else if (repoInfo.user && !repoInfo.password) {
                missingFields.push('password (user provided without password)')
            } else if (repoInfo.password && !repoInfo.user) {
                missingFields.push('user (password provided without user)')
            }
        }

        if (missingFields.length > 0) {
            res.send(
                new BaseApi(
                    ApiStatusCodes.ILLEGAL_PARAMETER,
                    `Missing required Git fields: ${missingFields.join(', ')}`
                )
            )
            return
        }
    }

    if (
        repoInfo &&
        repoInfo.sshKey &&
        repoInfo.sshKey.indexOf('ENCRYPTED') > 0 &&
        !CaptainConstants.configs.disableEncryptedCheck
    ) {
        res.send(
            new BaseApi(
                ApiStatusCodes.ILLEGAL_PARAMETER,
                'You cannot use encrypted SSH keys'
            )
        )
        return
    }

    if (
        repoInfo &&
        repoInfo.sshKey &&
        repoInfo.sshKey.indexOf('END OPENSSH PRIVATE KEY-----') > 0
    ) {
        repoInfo.sshKey = repoInfo.sshKey.trim()
        repoInfo.sshKey = repoInfo.sshKey + '\n'
    }

    // BUG FIX #1: Check if app is already being updated
    if (appsBeingUpdated.has(appName)) {
        res.send(
            new BaseApi(
                ApiStatusCodes.ILLEGAL_OPERATION,
                `App '${appName}' is currently being updated by another request. Please wait for the previous update to complete.`
            )
        )
        return
    }

    Logger.d(`Updating app started: ${appName}`)

    // Mark app as being updated
    appsBeingUpdated.add(appName)

    return serviceManager
        .updateAppDefinition(
            appName,
            projectId,
            description,
            Number(instanceCount),
            captainDefinitionRelativeFilePath,
            envVars,
            volumes,
            tags,
            nodeId,
            notExposeAsWebApp,
            containerHttpPort,
            httpAuth,
            forceSsl,
            ports,
            repoInfo,
            customNginxConfig,
            redirectDomain,
            preDeployFunction,
            serviceUpdateOverride,
            websocketSupport,
            appDeployTokenConfig
        )
        .then(function () {
            Logger.d(`AppName is updated: ${appName}`)
            // BUG FIX #1: Release the lock
            appsBeingUpdated.delete(appName)
            res.send(
                new BaseApi(
                    ApiStatusCodes.STATUS_OK,
                    'Updated App Definition Saved'
                )
            )
        })
        .catch(function (error) {
            // BUG FIX #1: Release the lock on error
            appsBeingUpdated.delete(appName)
            return ApiStatusCodes.createCatcher(res)(error)
        })
})

export default router
