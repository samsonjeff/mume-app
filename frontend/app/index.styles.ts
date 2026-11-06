import { Platform, StyleSheet } from "react-native"

import { THEME } from "../constants/theme"

export const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,

    backgroundColor: THEME.colors.bg,

    position: "relative",

    overflow: "hidden",

    height: (Platform.OS === "web" ? "100vh" : "100%") as any,

    maxHeight: (Platform.OS === "web" ? "100vh" : "100%") as any,
  },

  splashOverlay: {
    ...StyleSheet.absoluteFill,

    zIndex: 9999,

    alignItems: "center",

    justifyContent: "center",
  },

  splashLogoContainer: {
    width: 150,

    height: 60,

    alignItems: "center",

    justifyContent: "center",

    position: "relative",
  },

  splashLogoAbsolute: {
    position: "absolute",

    alignItems: "center",

    justifyContent: "center",
  },

  headerSafeArea: {
    backgroundColor: THEME.colors.obsidian,
  },

  headerRow: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    paddingHorizontal: 16,

    paddingVertical: 10,

    borderBottomWidth: 0,

    backgroundColor: THEME.colors.obsidian,
  },

  bodySafeArea: {
    flex: 1,

    backgroundColor: THEME.colors.bg,

    flexDirection: "column",

    position: "relative",

    overflow: "hidden",
  },

  mainScrollView: {
    flex: 1,

    overflow: "hidden",

    overscrollBehavior: "none" as any,
  },

  headerLogoContainer: {
    alignItems: "center",

    justifyContent: "center",
  },

  menuIconButton: {
    width: 38,

    height: 38,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "transparent",

    borderWidth: 0,
  },

  profileBadge: {
    width: 38,

    height: 38,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "transparent",

    borderWidth: 0,
  },

  profileBadgePro: {
    backgroundColor: "rgba(250, 204, 21, 0.2)",

    borderRadius: 19,

    borderWidth: 1.5,

    borderColor: "#FACC15",
  },

  scrollContent: {
    paddingHorizontal: 16,

    paddingTop: 8,

    paddingBottom: 8,

    flexGrow: 1,
  },

  scrollContentToday: {
    flex: 1,

    paddingBottom: 4,
  },

  scrollContentExpanded: {
    flexGrow: 1,
  },

  scrollContentCatalog: {
    paddingBottom: 72,
  },

  scrollContentEditingDraft: {
    paddingBottom: 12,
  },

  screenContainer: {
    width: "100%",

    flex: 1,
  },

  screenContainerExpanded: {
    flex: 1,
  },

  geminiZeroStateContainer: {
    flexDirection: "row",

    alignItems: "flex-start",

    justifyContent: "space-between",

    gap: 10,

    marginTop: 4,

    marginBottom: 8,
  },

  geminiHeroCopy: {
    flex: 1,
  },

  geminiSparkleBadge: {
    width: 44,

    height: 44,

    borderRadius: 22,

    backgroundColor: THEME.colors.primaryTint,

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 12,
  },

  geminiHeroTitle: {
    color: THEME.colors.text,

    fontSize: 22,

    fontWeight: "800",

    letterSpacing: -0.5,
  },

  geminiHeroSubtitle: {
    color: THEME.colors.textMuted,

    fontSize: 12,

    fontWeight: "500",

    marginTop: 2,
  },

  geminiChipsScroll: {
    flexDirection: "row",

    gap: 8,

    paddingVertical: 4,

    marginBottom: 20,
  },

  geminiChip: {
    flexDirection: "row",

    alignItems: "center",

    gap: 6,

    backgroundColor: THEME.colors.card,

    paddingHorizontal: 12,

    paddingVertical: 8,

    borderRadius: 18,

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,

    shadowColor: "#000000",

    shadowOffset: { width: 0, height: 1 },

    shadowOpacity: 0.04,

    shadowRadius: 3,

    elevation: 1,
  },

  geminiChipText: {
    fontSize: 12,

    fontWeight: "600",

    color: THEME.colors.text,
  },

  greetingTitle: {
    color: THEME.colors.text,

    fontSize: 22,

    fontWeight: "800",
  },

  greetingSubtitle: {
    color: THEME.colors.textMuted,

    fontSize: 13,

    marginTop: 2,
  },

  summaryCard: {
    backgroundColor: THEME.colors.card,

    borderRadius: 16,

    padding: 16,

    borderWidth: 1.5,

    borderColor: THEME.colors.cardBorder,

    flexDirection: "row",

    alignItems: "center",

    marginBottom: 24,
  },

  summaryIconContainer: {
    width: 44,

    height: 44,

    borderRadius: 22,

    backgroundColor: THEME.colors.primaryLight,

    alignItems: "center",

    justifyContent: "center",

    marginRight: 12,
  },

  summaryIconText: {
    fontSize: 20,
  },

  summaryCopy: {
    flex: 1,
  },

  summaryTitle: {
    color: THEME.colors.text,

    fontSize: 16,

    fontWeight: "700",
  },

  summarySubtitle: {
    color: THEME.colors.textMuted,

    fontSize: 13,

    marginTop: 2,
  },

  chevronText: {
    color: THEME.colors.textMuted,

    fontSize: 22,

    fontWeight: "600",

    paddingHorizontal: 6,
  },

  sectionHeaderRow: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginBottom: 6,
  },

  sectionHeading: {
    color: THEME.colors.text,

    fontSize: 18,

    fontWeight: "800",
  },

  sectionBadge: {
    color: THEME.colors.textMuted,

    fontSize: 12,

    fontWeight: "600",
  },

  sectionBadgePill: {
    flexDirection: "row",

    alignItems: "center",

    gap: 6,

    paddingHorizontal: 10,

    paddingVertical: 4,

    borderRadius: 999,
  },

  sectionBadgePending: {
    backgroundColor: THEME.colors.cardElevated,

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,
  },

  sectionBadgeApproved: {
    backgroundColor: THEME.colors.cardElevated,

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,
  },

  sectionBadgeTextPending: {
    color: THEME.colors.text,

    fontSize: 12,

    fontWeight: "600",
  },

  sectionBadgeTextApproved: {
    color: THEME.colors.textMuted,

    fontSize: 12,

    fontWeight: "600",
  },

  approvalCard: {
    backgroundColor: THEME.colors.card,

    borderRadius: 18,

    padding: 12,

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,

    marginBottom: 8,

    shadowColor: "#000000",

    shadowOffset: { width: 0, height: 2 },

    shadowOpacity: 0.04,

    shadowRadius: 8,

    elevation: 2,
  },

  approvalCardEditing: {
    borderColor: THEME.colors.obsidian,

    shadowOpacity: 0.08,

    shadowRadius: 12,
  },

  cardTopline: {
    flexDirection: "row",

    justifyContent: "flex-end",

    alignItems: "center",

    marginBottom: 6,

    width: "100%",
  },

  statusDotAmber: {
    width: 6,

    height: 6,

    borderRadius: 3,

    backgroundColor: THEME.colors.obsidian,
  },

  timeLabel: {
    color: THEME.colors.textMuted,

    fontSize: 11,
  },

  customerRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 10,

    marginBottom: 8,
  },

  customerInfoCol: {
    flex: 1,
  },

  avatar: {
    width: 36,

    height: 36,

    borderRadius: 18,

    backgroundColor: THEME.colors.primaryTint,

    alignItems: "center",

    justifyContent: "center",
  },

  avatarText: {
    color: THEME.colors.primaryDark,

    fontSize: 13,

    fontWeight: "700",
  },

  customerName: {
    color: THEME.colors.text,

    fontSize: 14.5,

    fontWeight: "700",
  },

  customerContext: {
    color: THEME.colors.textMuted,

    fontSize: 11.5,
  },

  messageBubble: {
    backgroundColor: THEME.colors.bg,

    borderRadius: 10,

    padding: 10,

    marginBottom: 8,

    borderLeftWidth: 3,

    borderLeftColor: THEME.colors.primary,
  },

  messageBubbleText: {
    color: THEME.colors.text,

    fontSize: 13.5,

    fontStyle: "italic",
  },

  draftBlock: {
    backgroundColor: THEME.colors.cardElevated,

    borderRadius: 12,

    padding: 10,

    marginBottom: 8,

    borderWidth: 1.5,

    borderColor: THEME.colors.cardBorder,
  },

  draftBlockEditing: {
    borderColor: THEME.colors.primary,

    backgroundColor: "#FFFFFF",

    shadowColor: THEME.colors.primary,

    shadowOffset: { width: 0, height: 2 },

    shadowOpacity: 0.1,

    shadowRadius: 8,

    elevation: 2,
  },

  draftLabelRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 6,

    marginBottom: 4,
  },

  draftLabelLeft: {
    flexDirection: "row",

    alignItems: "center",

    gap: 6,
  },

  draftIconText: {
    fontSize: 13,
  },

  draftLabelText: {
    color: THEME.colors.text,

    fontSize: 11.5,

    fontWeight: "700",
  },

  draftEditorWrapper: {
    marginTop: 2,
  },

  draftEditorHint: {
    color: THEME.colors.textMuted,

    fontSize: 11,

    fontWeight: "600",

    marginBottom: 4,
  },

  draftTextInput: {
    backgroundColor: "#FFFFFF",

    borderRadius: 8,

    borderWidth: 1.5,

    borderColor: THEME.colors.primary,

    color: THEME.colors.text,

    paddingHorizontal: 10,

    paddingVertical: 8,

    fontSize: 13.5,

    lineHeight: 18,

    minHeight: 64,

    textAlignVertical: "top",
  },

  draftTextContainer: {
    paddingVertical: 2,
  },

  draftText: {
    color: THEME.colors.text,

    fontSize: 13.5,

    lineHeight: 19,
  },

  tapToEditHint: {
    color: THEME.colors.primary,

    fontSize: 11,

    fontWeight: "600",

    marginTop: 4,
  },

  approvalActions: {
    flexDirection: "row",

    gap: 10,

    marginBottom: 0,
  },

  secondaryButton: {
    flex: 1,

    minHeight: THEME.ergonomics.minTapTarget,

    backgroundColor: THEME.colors.cardElevated,

    borderRadius: 999,

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,

    alignItems: "center",

    justifyContent: "center",
  },

  secondaryButtonActive: {
    borderColor: THEME.colors.primary,

    backgroundColor: "rgba(50, 121, 249, 0.08)",
  },

  secondaryButtonText: {
    color: THEME.colors.text,

    fontSize: 14,

    fontWeight: "700",
  },

  primaryButton: {
    flex: 1.4,

    minHeight: THEME.ergonomics.minTapTarget,

    backgroundColor: THEME.colors.obsidian,

    borderRadius: 999,

    alignItems: "center",

    justifyContent: "center",
  },

  linkDirectButton: {
    marginTop: 16,

    width: "100%",
  },

  primaryButtonText: {
    color: THEME.colors.textInverted,

    fontSize: 14,

    fontWeight: "700",
  },

  emptyCard: {
    backgroundColor: THEME.colors.card,

    borderRadius: 18,

    padding: 28,

    alignItems: "center",

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,

    marginBottom: 18,
  },

  buttonInnerRow: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 8,
  },

  emptyCheckBadge: {
    width: 52,

    height: 52,

    borderRadius: 26,

    backgroundColor: "rgba(0, 185, 92, 0.12)",

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 12,
  },

  emptyCardTitle: {
    color: THEME.colors.text,

    fontSize: 18,

    fontWeight: "800",

    marginBottom: 4,
  },

  emptyCardSubtitle: {
    color: THEME.colors.textMuted,

    fontSize: 13,

    textAlign: "center",

    lineHeight: 18,
  },

  conversationCard: {
    backgroundColor: THEME.colors.card,

    borderRadius: 14,

    padding: 14,

    flexDirection: "row",

    alignItems: "center",

    gap: 12,

    marginBottom: 10,

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,
  },

  conversationAvatar: {
    width: 44,

    height: 44,

    borderRadius: 22,

    backgroundColor: THEME.colors.primaryTint,

    alignItems: "center",

    justifyContent: "center",
  },

  conversationAvatarText: {
    color: THEME.colors.primaryDark,

    fontSize: 14,

    fontWeight: "700",
  },

  conversationCopy: {
    flex: 1,
  },

  conversationName: {
    color: THEME.colors.text,

    fontSize: 15,

    fontWeight: "700",
  },

  conversationMessage: {
    color: THEME.colors.textMuted,

    fontSize: 13,

    marginTop: 2,
  },

  conversationMeta: {
    alignItems: "flex-end",

    gap: 4,
  },

  conversationTime: {
    color: THEME.colors.textMuted,

    fontSize: 11,
  },

  unreadDot: {
    width: 8,

    height: 8,

    borderRadius: 4,

    backgroundColor: THEME.colors.primary,
  },

  inboxThreadContainer: {
    flex: 1,
  },

  inboxThreadHeader: {
    backgroundColor: THEME.colors.card,

    borderRadius: 14,

    padding: 12,

    flexDirection: "row",

    alignItems: "center",

    gap: 10,

    marginBottom: 10,

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,
  },

  inboxBackBtn: {
    width: 44,

    height: 44,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 22,
  },

  inboxThreadScroll: {
    flex: 1,
  },

  inboxThreadContent: {
    paddingBottom: 8,

    gap: 8,
  },

  inboxReplyRow: {
    flexDirection: "column",

    backgroundColor: THEME.colors.card,

    borderRadius: 20,

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,

    shadowColor: "#000000",

    shadowOffset: { width: 0, height: 3 },

    shadowOpacity: 0.06,

    shadowRadius: 10,

    elevation: 4,

    width: "100%",

    minHeight: 96,

    paddingHorizontal: 12,

    paddingTop: 6,

    paddingBottom: 6,

    marginTop: 10,
  },

  inboxReplyInput: {
    backgroundColor: "transparent",

    borderWidth: 0,

    fontSize: 15,

    color: THEME.colors.text,

    paddingHorizontal: 6,

    paddingVertical: 8,

    minHeight: 64,

    maxHeight: 120,

    textAlignVertical: "top",
  },

  inboxReplyToolbar: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    width: "100%",

    paddingTop: 4,
  },

  inboxReplyHint: {
    fontSize: 12,

    color: THEME.colors.textMuted,

    fontWeight: "600",
  },

  inboxSendBtn: {
    width: 36,

    height: 36,

    borderRadius: 18,

    backgroundColor: THEME.colors.cardElevated,

    alignItems: "center",

    justifyContent: "center",
  },

  inboxSendBtnActive: {
    backgroundColor: THEME.colors.obsidian,

    shadowColor: "#000000",

    shadowOffset: { width: 0, height: 2 },

    shadowOpacity: 0.25,

    shadowRadius: 4,

    elevation: 3,
  },

  inboxErrorText: {
    color: "#FC413D",

    fontSize: 13,

    marginTop: 8,
  },

  catalogGrid: {
    flexDirection: "row",

    flexWrap: "wrap",

    gap: 12,
  },

  productCard: {
    width: "47%",

    backgroundColor: THEME.colors.card,

    borderRadius: 16,

    padding: 12,

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,

    alignItems: "center",

    shadowColor: "#000000",

    shadowOffset: { width: 0, height: 2 },

    shadowOpacity: 0.05,

    shadowRadius: 6,

    elevation: 2,
  },

  productImageContainer: {
    width: "100%",

    height: 96,

    position: "relative",

    borderRadius: 12,

    marginBottom: 8,

    overflow: "hidden",
  },

  productImage: {
    width: "100%",

    height: "100%",

    borderRadius: 12,

    backgroundColor: THEME.colors.cardElevated,
  },

  productName: {
    color: THEME.colors.text,

    fontSize: 14,

    fontWeight: "700",

    textAlign: "center",
  },

  productPrice: {
    color: THEME.colors.text,

    fontSize: 13,

    fontWeight: "800",

    marginTop: 4,
  },

  stockPill: {
    position: "absolute",

    top: 6,

    right: 6,

    paddingHorizontal: 8,

    paddingVertical: 3,

    borderRadius: 12,

    zIndex: 2,

    shadowColor: "#000000",

    shadowOffset: { width: 0, height: 1 },

    shadowOpacity: 0.15,

    shadowRadius: 3,

    elevation: 2,
  },

  stockIn: {
    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "rgba(0, 0, 0, 0.12)",
  },

  stockLow: {
    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "rgba(0, 0, 0, 0.12)",
  },

  stockOut: {
    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "rgba(0, 0, 0, 0.12)",
  },

  stockPillText: {
    fontSize: 10,

    fontWeight: "700",

    color: "#121317",
  },

  stockInText: {
    color: "#121317",
  },

  stockLowText: {
    color: "#121317",
  },

  stockOutText: {
    color: "#121317",
  },

  catalogHeaderRow: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginBottom: 16,
  },

  sectionBadgeText: {
    color: THEME.colors.textMuted,

    fontSize: 12,

    fontWeight: "600",

    marginTop: 2,
  },

  addProductBtn: {
    flexDirection: "row",

    alignItems: "center",

    gap: 6,

    backgroundColor: "#121317",

    paddingHorizontal: 14,

    paddingVertical: 8,

    borderRadius: 20,

    borderWidth: 1,

    borderColor: "#121317",

    shadowColor: "#000000",

    shadowOffset: { width: 0, height: 2 },

    shadowOpacity: 0.15,

    shadowRadius: 4,

    elevation: 3,
  },

  addProductBtnText: {
    color: "#FFFFFF",

    fontSize: 13,

    fontWeight: "700",
  },

  addProductFab: {
    position: "absolute",

    bottom: 24,

    right: 20,

    width: 52,

    height: 52,

    borderRadius: 26,

    backgroundColor: "#121317",

    alignItems: "center",

    justifyContent: "center",

    shadowColor: "#000000",

    shadowOffset: { width: 0, height: 4 },

    shadowOpacity: 0.25,

    shadowRadius: 8,

    elevation: 6,

    zIndex: 20,

    cursor: (Platform.OS === "web" ? "pointer" : "auto") as any,
  },

  emptyCatalogCard: {
    backgroundColor: THEME.colors.card,

    borderRadius: 16,

    padding: 32,

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,

    alignItems: "center",
  },

  emptyCatalogTitle: {
    fontSize: 16,

    fontWeight: "700",

    color: THEME.colors.text,

    marginBottom: 6,
  },

  emptyCatalogSubtitle: {
    fontSize: 13,

    color: THEME.colors.textMuted,

    textAlign: "center",
  },

  productModalOverlay: {
    flex: 1,

    backgroundColor: "rgba(0, 0, 0, 0.55)",

    justifyContent: "center",

    alignItems: "center",

    padding: 20,
  },

  productModalCard: {
    width: "100%",

    maxWidth: 380,

    maxHeight: "90%",

    backgroundColor: "#FFFFFF",

    borderRadius: 20,

    padding: 20,

    shadowColor: "#000000",

    shadowOffset: { width: 0, height: 10 },

    shadowOpacity: 0.25,

    shadowRadius: 20,

    elevation: 10,
  },

  productModalHeader: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "flex-start",

    marginBottom: 16,

    borderBottomWidth: 1,

    borderBottomColor: "#F4F4F5",

    paddingBottom: 12,
  },

  productModalTitle: {
    fontSize: 18,

    fontWeight: "700",

    color: THEME.colors.text,
  },

  productModalSubtitle: {
    fontSize: 12,

    color: THEME.colors.textMuted,

    marginTop: 2,
  },

  productModalCloseBtn: {
    padding: 4,
  },

  productModalScroll: {
    maxHeight: 380,
  },

  productFieldLabel: {
    fontSize: 11,

    fontWeight: "700",

    color: THEME.colors.text,

    marginBottom: 6,

    marginTop: 12,

    textTransform: "uppercase",

    letterSpacing: 0.5,
  },

  uploadPhotoBtn: {
    borderWidth: 1.5,

    borderStyle: "dashed",

    borderColor: "#D4D4D8",

    borderRadius: 14,

    padding: 12,

    backgroundColor: "#FAFAFA",

    marginBottom: 4,
  },

  uploadPhotoBtnActive: {
    borderColor: "#121317",

    borderStyle: "solid",

    backgroundColor: "#F4F4F5",
  },

  uploadPhotoPlaceholderRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 12,
  },

  uploadPhotoIconCircle: {
    width: 38,

    height: 38,

    borderRadius: 19,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#E4E4E7",

    justifyContent: "center",

    alignItems: "center",
  },

  uploadPhotoTitle: {
    fontSize: 13,

    fontWeight: "700",

    color: "#121317",
  },

  uploadPhotoSub: {
    fontSize: 11,

    color: THEME.colors.textMuted,

    marginTop: 1,
  },

  uploadPhotoPreviewRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 12,
  },

  uploadPhotoPreviewThumb: {
    width: 48,

    height: 48,

    borderRadius: 10,
  },

  uploadPhotoSuccessTitle: {
    fontSize: 13,

    fontWeight: "700",

    color: "#121317",
  },

  uploadPhotoSuccessSub: {
    fontSize: 11,

    color: THEME.colors.textMuted,

    marginTop: 1,
  },

  uploadPhotoChangeBadge: {
    flexDirection: "row",

    alignItems: "center",

    gap: 4,

    backgroundColor: "#121317",

    paddingHorizontal: 10,

    paddingVertical: 5,

    borderRadius: 12,
  },

  uploadPhotoChangeBadgeText: {
    color: "#FFFFFF",

    fontSize: 11,

    fontWeight: "700",
  },

  productInput: {
    borderWidth: 1,

    borderColor: "#E4E4E7",

    borderRadius: 10,

    paddingHorizontal: 12,

    paddingVertical: 10,

    fontSize: 14,

    color: THEME.colors.text,

    backgroundColor: "#F9FAFB",
  },

  stockStatusRow: {
    flexDirection: "row",

    gap: 8,

    marginBottom: 8,
  },

  stockStatusBtn: {
    flex: 1,

    borderWidth: 1,

    borderColor: "#E4E4E7",

    borderRadius: 8,

    paddingVertical: 8,

    alignItems: "center",

    backgroundColor: "#FAFAFA",
  },

  stockStatusBtnActive: {
    borderColor: THEME.colors.primary,

    backgroundColor: "#EFF6FF",
  },

  stockStatusText: {
    fontSize: 11,

    fontWeight: "600",

    color: THEME.colors.textMuted,
  },

  stockStatusTextActive: {
    color: THEME.colors.primary,

    fontWeight: "700",
  },

  productModalActions: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginTop: 18,

    paddingTop: 14,

    borderTopWidth: 1,

    borderTopColor: "#F4F4F5",
  },

  productDeleteBtn: {
    flexDirection: "row",

    alignItems: "center",

    gap: 6,

    paddingVertical: 8,

    paddingHorizontal: 10,

    borderRadius: 8,
  },

  productDeleteBtnText: {
    color: "#DC2626",

    fontSize: 13,

    fontWeight: "700",
  },

  productModalRightBtns: {
    flexDirection: "row",

    alignItems: "center",

    gap: 8,
  },

  productCancelBtn: {
    paddingVertical: 8,

    paddingHorizontal: 14,

    borderRadius: 8,
  },

  productCancelBtnText: {
    color: THEME.colors.textMuted,

    fontSize: 13,

    fontWeight: "600",
  },

  productSaveBtn: {
    backgroundColor: THEME.colors.primary,

    paddingVertical: 8,

    paddingHorizontal: 16,

    borderRadius: 8,
  },

  productSaveBtnText: {
    color: "#FFFFFF",

    fontSize: 13,

    fontWeight: "700",
  },

  settingsCard: {
    backgroundColor: THEME.colors.card,

    borderRadius: 16,

    padding: 18,

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,

    marginBottom: 16,
  },

  settingsCardTitle: {
    color: THEME.colors.text,

    fontSize: 11,

    fontWeight: "700",

    letterSpacing: 0.8,

    marginBottom: 10,
  },

  pageBadgeRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 6,

    marginBottom: 4,
  },

  statusDotGreen: {
    color: THEME.colors.speaking,

    fontSize: 14,
  },

  pageName: {
    color: THEME.colors.text,

    fontSize: 18,

    fontWeight: "700",
  },

  pageDetails: {
    color: THEME.colors.textMuted,

    fontSize: 12,

    marginTop: 2,
  },

  secureTag: {
    marginTop: 8,

    backgroundColor: THEME.colors.primaryTint,

    borderRadius: 8,

    alignSelf: "flex-start",

    paddingHorizontal: 8,

    paddingVertical: 4,
  },

  secureTagText: {
    color: THEME.colors.primaryDark,

    fontSize: 11,

    fontWeight: "600",
  },

  cardValueMuted: {
    color: THEME.colors.textMuted,

    fontSize: 14,
  },

  cardHelp: {
    color: THEME.colors.textMuted,

    fontSize: 12,

    marginTop: 4,

    lineHeight: 16,
  },

  fbButton: {
    backgroundColor: "#1877F2",

    minHeight: THEME.ergonomics.minTapTarget,

    borderRadius: 12,

    alignItems: "center",

    justifyContent: "center",
  },

  fbButtonText: {
    color: "#FFFFFF",

    fontSize: 15,

    fontWeight: "700",
  },

  inputLabel: {
    color: THEME.colors.text,

    fontSize: 12,

    fontWeight: "600",

    marginBottom: 4,

    marginTop: 8,
  },

  input: {
    backgroundColor: THEME.colors.bg,

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,

    borderRadius: 10,

    color: THEME.colors.text,

    paddingHorizontal: 12,

    paddingVertical: 10,

    fontSize: 14,
  },

  tokenInput: {
    minHeight: 60,

    textAlignVertical: "top",
  },

  linkMessageText: {
    color: THEME.colors.text,

    fontSize: 12,

    fontWeight: "600",

    marginTop: 8,

    textAlign: "center",
  },

  keyboardAvoidingContainer: {
    flex: 1,
  },

  geminiInputDockContainer: {
    width: "100%",

    maxWidth: 480,

    alignSelf: "center",

    paddingHorizontal: 16,

    paddingTop: 4,

    paddingBottom: 8,

    alignItems: "center",

    backgroundColor: THEME.colors.bg,
  },

  geminiInputCapsule: {
    flexDirection: "column",

    justifyContent: "space-between",

    backgroundColor: THEME.colors.card,

    borderRadius: 20,

    minHeight: 96,

    width: "100%",

    paddingHorizontal: 12,

    paddingTop: 6,

    paddingBottom: 6,

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,

    shadowColor: "#000000",

    shadowOffset: { width: 0, height: 3 },

    shadowOpacity: 0.06,

    shadowRadius: 10,

    elevation: 4,
  },

  capsuleTextInputWrapper: {
    width: "100%",

    minHeight: 40,

    maxHeight: 80,

    justifyContent: "center",
  },

  capsuleTextInput: {
    fontSize: 13.5,

    color: THEME.colors.text,

    paddingHorizontal: 6,

    paddingVertical: 2,

    minHeight: 34,

    textAlignVertical: "top",
  },

  capsuleControlsRow: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    width: "100%",

    paddingTop: 4,
  },

  geminiPlusButton: {
    width: 36,

    height: 36,

    borderRadius: 18,

    backgroundColor: THEME.colors.cardElevated,

    alignItems: "center",

    justifyContent: "center",
  },

  capsuleStatusArea: {
    flex: 1,

    marginHorizontal: 10,

    justifyContent: "center",
  },

  capsuleHintText: {
    fontSize: 12,

    color: THEME.colors.textMuted,

    fontWeight: "500",
  },

  capsuleErrorText: {
    fontSize: 11.5,

    color: THEME.colors.danger,

    fontWeight: "600",
  },

  capsuleActionsRight: {
    flexDirection: "row",

    alignItems: "center",

    gap: 8,
  },

  geminiMicSmallButton: {
    width: 36,

    height: 36,

    borderRadius: 18,

    backgroundColor: THEME.colors.cardElevated,

    alignItems: "center",

    justifyContent: "center",
  },

  geminiMicSmallButtonActive: {
    backgroundColor: THEME.colors.obsidian,

    transform: [{ scale: 1.05 }],
  },

  geminiSendButton: {
    width: 36,

    height: 36,

    borderRadius: 18,

    backgroundColor: THEME.colors.cardElevated,

    alignItems: "center",

    justifyContent: "center",
  },

  geminiSendButtonActive: {
    backgroundColor: THEME.colors.obsidian,

    shadowColor: "#000000",

    shadowOffset: { width: 0, height: 2 },

    shadowOpacity: 0.25,

    shadowRadius: 4,

    elevation: 3,
  },

  geminiInputArea: {
    flex: 1,

    marginHorizontal: 12,

    justifyContent: "center",
  },

  geminiInputPlaceholder: {
    fontSize: 14,

    color: THEME.colors.textMuted,

    fontWeight: "500",
  },

  voiceStateRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 8,
  },

  voiceStateListeningText: {
    fontSize: 13,

    fontWeight: "700",

    color: THEME.colors.text,
  },

  voiceStateThinkingText: {
    fontSize: 13,

    fontWeight: "700",

    color: THEME.colors.text,
  },

  geminiMicButton: {
    width: 44,

    height: 44,

    borderRadius: 22,

    backgroundColor: THEME.colors.obsidian,

    alignItems: "center",

    justifyContent: "center",

    shadowColor: "#000000",

    shadowOffset: { width: 0, height: 2 },

    shadowOpacity: 0.25,

    shadowRadius: 4,

    elevation: 3,
  },

  geminiMicButtonActive: {
    transform: [{ scale: 1.05 }],
  },

  // Chat stream styles

  chatSectionCard: {
    backgroundColor: THEME.colors.card,

    borderRadius: 18,

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,

    padding: 12,

    marginBottom: 6,

    shadowColor: "#000000",

    shadowOffset: { width: 0, height: 2 },

    shadowOpacity: 0.04,

    shadowRadius: 6,

    elevation: 2,

    flex: 1,

    minHeight: 120,
  },

  chatSectionCardHighlighted: {
    borderColor: "#3279F9",

    borderWidth: 1.5,

    backgroundColor: "#FFFFFF",

    shadowColor: "#3279F9",

    shadowOffset: { width: 0, height: 4 },

    shadowOpacity: 0.18,

    shadowRadius: 10,

    elevation: 4,
  },

  chatSectionCardExpanded: {
    flex: 1,

    minHeight: 280,

    marginBottom: 0,
  },

  chatSectionHeader: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    paddingBottom: 8,

    borderBottomWidth: 1,

    borderBottomColor: THEME.colors.cardBorder,

    marginBottom: 8,
  },

  chatHeaderLeft: {
    flexDirection: "row",

    alignItems: "center",

    gap: 10,
  },

  chatHeaderBadge: {
    width: 30,

    height: 30,

    borderRadius: 15,

    backgroundColor: THEME.colors.obsidian,

    alignItems: "center",

    justifyContent: "center",
  },

  chatHeaderBadgeActive: {
    backgroundColor: "#3279F9",
  },

  chatHeaderTitle: {
    fontSize: 14,

    fontWeight: "700",

    color: THEME.colors.text,
  },

  chatCollapseBtn: {
    width: 36,

    height: 36,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 18,
  },

  activeHighlightBadge: {
    flexDirection: "row",

    alignItems: "center",

    gap: 5,

    backgroundColor: "rgba(50, 121, 249, 0.12)",

    paddingHorizontal: 8,

    paddingVertical: 3,

    borderRadius: 999,

    borderWidth: 1,

    borderColor: "rgba(50, 121, 249, 0.28)",
  },

  activeHighlightDot: {
    width: 6,

    height: 6,

    borderRadius: 3,

    backgroundColor: "#3279F9",
  },

  activeHighlightText: {
    fontSize: 11.5,

    fontWeight: "600",

    color: "#1A73E8",
  },

  chatScrollView: {
    flex: 1,

    overflow: "hidden",

    overscrollBehavior: "contain" as any,
  },

  chatMessagesList: {
    flexGrow: 1,

    gap: 8,

    paddingBottom: 2,
  },

  chatMessagesSpacer: {
    flex: 1,

    minHeight: 0,
  },

  chatBubbleRow: {
    flexDirection: "row",

    alignItems: "flex-end",

    gap: 8,
  },

  chatBubbleRowUser: {
    justifyContent: "flex-end",
  },

  chatBubbleRowAi: {
    justifyContent: "flex-start",
  },

  chatAvatarAi: {
    width: 26,

    height: 26,

    borderRadius: 13,

    backgroundColor: THEME.colors.obsidian,

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 2,
  },

  chatBubble: {
    maxWidth: "85%",

    paddingHorizontal: 12,

    paddingVertical: 8,

    borderRadius: 14,
  },

  chatBubbleUser: {
    backgroundColor: THEME.colors.obsidian,

    borderBottomRightRadius: 4,
  },

  chatBubbleAi: {
    backgroundColor: THEME.colors.cardElevated,

    borderBottomLeftRadius: 4,

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,
  },

  chatThinkingBubble: {
    flexDirection: "row",

    alignItems: "center",

    gap: 10,
  },

  chatThinkingText: {
    fontSize: 13,

    color: THEME.colors.textMuted,

    fontWeight: "500",
  },

  chatBubbleText: {
    fontSize: 13.5,

    lineHeight: 18,
  },

  chatBubbleTextUser: {
    color: "#FFFFFF",

    fontWeight: "500",
  },

  chatBubbleTextAi: {
    color: THEME.colors.text,

    fontWeight: "400",
  },

  chatBubbleTime: {
    fontSize: 10,

    marginTop: 4,

    alignSelf: "flex-end",
  },

  chatBubbleTimeUser: {
    color: "rgba(255, 255, 255, 0.65)",
  },

  chatBubbleTimeAi: {
    color: THEME.colors.textMuted,
  },

  capabilitiesDisclaimer: {
    fontSize: 11,

    color: THEME.colors.textMuted,

    textAlign: "center",

    marginTop: 4,

    fontWeight: "500",
  },

  // Side Menu Drawer Styles (Responsive Mobile First)

  drawerModalOverlay: {
    flex: 1,

    flexDirection: "row",
  },

  drawerBackdrop: {
    ...StyleSheet.absoluteFill,

    backgroundColor: "rgba(18, 19, 23, 0.55)",

    zIndex: 1,
  },

  drawerPanel: {
    width: 300,

    maxWidth: "82%",

    height: "100%",

    backgroundColor: THEME.colors.surface,

    paddingHorizontal: 16,

    borderRightWidth: 1,

    borderRightColor: THEME.colors.cardBorder,

    shadowColor: "#000000",

    shadowOffset: { width: 4, height: 0 },

    shadowOpacity: 0.18,

    shadowRadius: 20,

    elevation: 25,

    zIndex: 10,
  },

  drawerScrollContent: {
    flexGrow: 1,

    justifyContent: "space-between",

    paddingBottom: 10,
  },

  drawerTopSection: {
    flex: 1,
  },

  drawerHeader: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    paddingBottom: 16,

    borderBottomWidth: 1,

    borderBottomColor: THEME.colors.cardBorder,
  },

  drawerBrandRow: {
    flexDirection: "row",

    alignItems: "center",
  },

  drawerCloseButton: {
    width: 36,

    height: 36,

    borderRadius: 18,

    backgroundColor: THEME.colors.cardElevated,

    alignItems: "center",

    justifyContent: "center",
  },

  drawerStoreCard: {
    marginTop: 14,

    padding: 12,

    backgroundColor: THEME.colors.cardElevated,

    borderRadius: 12,

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,
  },

  drawerStoreName: {
    fontSize: 13,

    fontWeight: "800",

    color: THEME.colors.text,
  },

  drawerStoreMeta: {
    fontSize: 11,

    color: THEME.colors.textMuted,

    marginTop: 2,

    fontWeight: "500",
  },

  drawerNavSection: {
    marginTop: 18,

    gap: 6,
  },

  drawerSectionLabel: {
    fontSize: 10.5,

    fontWeight: "700",

    color: THEME.colors.textMuted,

    letterSpacing: 0.8,

    marginBottom: 4,

    paddingHorizontal: 4,
  },

  drawerNavItem: {
    flexDirection: "row",

    alignItems: "center",

    paddingVertical: 12,

    paddingHorizontal: 12,

    borderRadius: 12,

    backgroundColor: "transparent",

    minHeight: 48,
  },

  drawerNavItemActive: {
    backgroundColor: THEME.colors.cardElevated,
  },

  drawerNavIconWrap: {
    width: 36,

    height: 36,

    borderRadius: 10,

    backgroundColor: THEME.colors.cardElevated,

    alignItems: "center",

    justifyContent: "center",

    marginRight: 12,
  },

  drawerNavIconWrapActive: {
    backgroundColor: THEME.colors.primaryTint,
  },

  drawerNavCopy: {
    flex: 1,
  },

  drawerNavTitle: {
    fontSize: 14,

    fontWeight: "600",

    color: THEME.colors.text,
  },

  drawerNavTitleActive: {
    fontWeight: "800",

    color: THEME.colors.primary,
  },

  drawerNavSubtitle: {
    fontSize: 11,

    color: THEME.colors.textMuted,

    marginTop: 1,
  },

  drawerActiveIndicator: {
    width: 4,

    height: 16,

    borderRadius: 2,

    backgroundColor: THEME.colors.primary,
  },

  drawerBadge: {
    backgroundColor: THEME.colors.primary,

    paddingHorizontal: 7,

    paddingVertical: 2,

    borderRadius: 10,
  },

  drawerBadgeText: {
    color: "#FFFFFF",

    fontSize: 11,

    fontWeight: "700",
  },

  drawerBadgeSecondary: {
    backgroundColor: THEME.colors.cardBorder,

    paddingHorizontal: 7,

    paddingVertical: 2,

    borderRadius: 10,
  },

  drawerBadgeTextSecondary: {
    color: THEME.colors.textMuted,

    fontSize: 11,

    fontWeight: "700",
  },

  drawerUserFooter: {
    flexDirection: "row",

    alignItems: "center",

    paddingTop: 14,

    marginTop: 14,

    borderTopWidth: 1,

    borderTopColor: THEME.colors.cardBorder,

    gap: 10,

    minHeight: 52,
  },

  drawerUserClickArea: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    gap: 10,
  },

  drawerLogoutBtn: {
    width: 36,

    height: 36,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "transparent",

    borderWidth: 0,
  },

  confirmModalOverlay: {
    flex: 1,

    backgroundColor: "rgba(0, 0, 0, 0.55)",

    justifyContent: "center",

    alignItems: "center",

    padding: 24,
  },

  confirmModalCard: {
    width: "100%",

    maxWidth: 340,

    backgroundColor: "#FFFFFF",

    borderRadius: 20,

    padding: 24,

    alignItems: "center",

    shadowColor: "#000000",

    shadowOffset: { width: 0, height: 10 },

    shadowOpacity: 0.25,

    shadowRadius: 20,

    elevation: 10,
  },

  confirmModalIconCircle: {
    width: 48,

    height: 48,

    borderRadius: 24,

    backgroundColor: "rgba(33, 34, 38, 0.06)",

    borderWidth: 1,

    borderColor: "rgba(33, 34, 38, 0.12)",

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 16,
  },

  confirmModalTitle: {
    fontSize: 18,

    fontWeight: "700",

    color: "#121317",

    marginBottom: 8,

    textAlign: "center",
  },

  confirmModalSubtitle: {
    fontSize: 13,

    color: "#676A72",

    textAlign: "center",

    lineHeight: 18,

    marginBottom: 20,
  },

  confirmModalActionsRow: {
    flexDirection: "row",

    gap: 12,

    width: "100%",
  },

  confirmModalCancelBtn: {
    flex: 1,

    height: 44,

    borderRadius: 12,

    backgroundColor: "#F0F1F5",

    alignItems: "center",

    justifyContent: "center",
  },

  confirmModalCancelText: {
    fontSize: 14,

    fontWeight: "600",

    color: "#45474D",
  },

  confirmModalLogoutBtn: {
    flex: 1,

    height: 44,

    borderRadius: 12,

    backgroundColor: "#121317",

    alignItems: "center",

    justifyContent: "center",
  },

  confirmModalLogoutText: {
    fontSize: 14,

    fontWeight: "700",

    color: "#FFFFFF",
  },

  drawerLoginBtn: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#1877F2",

    paddingVertical: 12,

    paddingHorizontal: 16,

    borderRadius: 12,

    gap: 8,

    shadowColor: "#1877F2",

    shadowOffset: { width: 0, height: 2 },

    shadowOpacity: 0.25,

    shadowRadius: 4,

    elevation: 3,
  },

  drawerLoginBtnText: {
    color: "#FFFFFF",

    fontSize: 14,

    fontWeight: "700",
  },

  emptyStateCard: {
    backgroundColor: THEME.colors.card,

    borderRadius: 16,

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,

    padding: 24,

    alignItems: "center",

    justifyContent: "center",

    marginTop: 12,
  },

  emptyStateIconCircle: {
    width: 60,

    height: 60,

    borderRadius: 30,

    backgroundColor: THEME.colors.cardElevated,

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 16,
  },

  emptyStateTitle: {
    fontSize: 17,

    fontWeight: "700",

    color: THEME.colors.text,

    marginBottom: 8,

    textAlign: "center",
  },

  emptyStateSubtitle: {
    fontSize: 13,

    color: THEME.colors.textMuted,

    textAlign: "center",

    lineHeight: 19,

    marginBottom: 20,

    paddingHorizontal: 10,
  },

  fbLoginPrimaryBtn: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#1877F2",

    paddingVertical: 12,

    paddingHorizontal: 20,

    borderRadius: 12,

    gap: 8,

    width: "100%",

    shadowColor: "#1877F2",

    shadowOffset: { width: 0, height: 2 },

    shadowOpacity: 0.25,

    shadowRadius: 4,

    elevation: 3,
  },

  fbLoginPrimaryBtnText: {
    color: "#FFFFFF",

    fontSize: 14,

    fontWeight: "700",
  },

  drawerUserAvatar: {
    width: 38,

    height: 38,

    borderRadius: 19,

    backgroundColor: THEME.colors.cardElevated,

    borderWidth: 1,

    borderColor: THEME.colors.cardBorder,

    alignItems: "center",

    justifyContent: "center",
  },

  drawerUserAvatarText: {
    fontSize: 13,

    fontWeight: "800",

    color: THEME.colors.text,
  },

  drawerUserCopy: {
    flex: 1,
  },

  drawerUserName: {
    fontSize: 13,

    fontWeight: "700",

    color: THEME.colors.text,
  },

  drawerUserRole: {
    fontSize: 11,

    color: THEME.colors.textMuted,
  },

  toast: {
    position: "absolute",

    bottom: 80,

    alignSelf: "center",

    backgroundColor: THEME.colors.text,

    borderRadius: 24,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 18,

    paddingVertical: 10,

    gap: 8,

    shadowColor: "#000000",

    shadowOffset: { width: 0, height: 4 },

    shadowOpacity: 0.25,

    shadowRadius: 8,

    elevation: 10,

    zIndex: 99,
  },

  toastIcon: {
    color: THEME.colors.speaking,

    fontSize: 16,

    fontWeight: "900",
  },

  toastText: {
    color: "#FFFFFF",

    fontSize: 13,

    fontWeight: "700",
  },

  proModalOverlay: {
    flex: 1,

    backgroundColor: "rgba(0, 0, 0, 0.65)",

    justifyContent: "center",

    alignItems: "center",

    padding: 20,
  },

  proModalCard: {
    width: "100%",

    maxWidth: 380,

    backgroundColor: "#FFFFFF",

    borderRadius: 24,

    padding: 22,

    shadowColor: "#000000",

    shadowOffset: { width: 0, height: 12 },

    shadowOpacity: 0.28,

    shadowRadius: 24,

    elevation: 12,
  },

  proModalHeader: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginBottom: 14,
  },

  proPlanBadge: {
    flexDirection: "row",

    alignItems: "center",

    gap: 6,

    backgroundColor: "#121317",

    paddingHorizontal: 10,

    paddingVertical: 5,

    borderRadius: 20,
  },

  proPlanBadgeText: {
    color: "#FFFFFF",

    fontSize: 11,

    fontWeight: "800",

    letterSpacing: 0.8,
  },

  proModalCloseBtn: {
    width: 32,

    height: 32,

    borderRadius: 16,

    backgroundColor: "#F4F4F5",

    alignItems: "center",

    justifyContent: "center",
  },

  proModalTitle: {
    fontSize: 22,

    fontWeight: "800",

    color: "#121317",

    marginBottom: 6,

    letterSpacing: -0.3,
  },

  proModalSubtitle: {
    fontSize: 13,

    color: THEME.colors.textMuted,

    lineHeight: 18,

    marginBottom: 18,
  },

  proPriceBox: {
    backgroundColor: "#FAFAFA",

    borderWidth: 1.5,

    borderColor: "#E4E4E7",

    borderRadius: 16,

    padding: 14,

    marginBottom: 16,
  },

  proPriceHeader: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginBottom: 6,
  },

  proPriceTier: {
    fontSize: 13,

    fontWeight: "700",

    color: "#121317",
  },

  proPriceTag: {
    backgroundColor: "#E0EAFF",

    paddingHorizontal: 8,

    paddingVertical: 3,

    borderRadius: 12,
  },

  proPriceTagText: {
    color: "#2563EB",

    fontSize: 10.5,

    fontWeight: "700",
  },

  proPriceAmountRow: {
    flexDirection: "row",

    alignItems: "baseline",

    gap: 2,

    marginBottom: 4,
  },

  proPriceCurrency: {
    fontSize: 18,

    fontWeight: "700",

    color: "#121317",
  },

  proPriceNumber: {
    fontSize: 28,

    fontWeight: "800",

    color: "#121317",

    letterSpacing: -0.5,
  },

  proPricePeriod: {
    fontSize: 13,

    fontWeight: "500",

    color: THEME.colors.textMuted,

    marginLeft: 2,
  },

  proPriceGuarantee: {
    fontSize: 11.5,

    color: "#71717A",

    fontWeight: "500",
  },

  proFeaturesList: {
    gap: 12,

    marginBottom: 20,
  },

  proFeatureItem: {
    flexDirection: "row",

    alignItems: "flex-start",

    gap: 12,
  },

  proFeatureIconCircle: {
    width: 34,

    height: 34,

    borderRadius: 17,

    backgroundColor: "#F4F4F5",

    alignItems: "center",

    justifyContent: "center",

    marginTop: 2,
  },

  proFeatureTextCol: {
    flex: 1,
  },

  proFeatureTitle: {
    fontSize: 13.5,

    fontWeight: "700",

    color: "#121317",

    marginBottom: 2,
  },

  proFeatureDesc: {
    fontSize: 11.5,

    color: THEME.colors.textMuted,

    lineHeight: 16,
  },

  proModalActions: {
    gap: 8,
  },

  proUpgradeBtn: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 8,

    backgroundColor: "#121317",

    paddingVertical: 13,

    borderRadius: 14,

    shadowColor: "#000000",

    shadowOffset: { width: 0, height: 4 },

    shadowOpacity: 0.15,

    shadowRadius: 8,

    elevation: 3,
  },

  proUpgradeBtnActive: {
    backgroundColor: "#121317",

    borderWidth: 1,

    borderColor: "#27272A",
  },

  proUpgradeBtnText: {
    color: "#FFFFFF",

    fontSize: 14,

    fontWeight: "700",
  },

  proDismissBtn: {
    paddingVertical: 10,

    alignItems: "center",

    justifyContent: "center",
  },

  proDismissBtnText: {
    color: THEME.colors.textMuted,

    fontSize: 13,

    fontWeight: "600",
  },
})
