function escapeHtml(text) {
    return text ? String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;") : "";
}

function formatDateTime(dateStr) {
    if (!dateStr) return "";
    var date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    var day = ("0" + date.getDate()).slice(-2);
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    var month = monthNames[date.getMonth()];
    var year = date.getFullYear();
    var hours = ("0" + date.getHours()).slice(-2);
    var minutes = ("0" + date.getMinutes()).slice(-2);
    
    return day + " " + month + " " + year + " " + hours + ":" + minutes;
}

function getComments_SAIC(post_id, num_comments, num_get_comments, order_comments) {
    var status = jQuery("#saic-comment-status-" + post_id),
        $container_comments = jQuery("ul#saic-container-comment-" + post_id);
        
    if (WDS_RSVP.spreadsheet_url) {
        status.addClass("saic-loading").html('<span class="saico-loading"></span>').show();
        
        fetch(WDS_RSVP.spreadsheet_url)
            .then(function(res) {
                if (!res.ok) throw new Error("Network response was not ok");
                return res.json();
            })
            .then(function(data) {
                status.removeClass("saic-loading").html("").hide();
                if (data && data.length) {
                    var html = "";
                    data.forEach(function(item) {
                        var attText = item.attendance === "present" ? "Hadir" : "Tidak Hadir";
                        var guestText = (item.attendance === "present" && item.guest) ? " (" + item.guest + " Orang)" : "";
                        var badgeBg = item.attendance === "present" ? "#d4edda" : "#f8d7da";
                        var badgeColor = item.attendance === "present" ? "#155724" : "#721c24";
                        var formattedDate = formatDateTime(item.timestamp);
                        
                        html += '<li class="saic-item-comment saic-clearfix" style="border-bottom:1px solid #eee; padding:12px 0; list-style:none;">' +
                            '<div class="saic-comment-content" style="margin-left:0 !important;">' +
                                '<div class="saic-comment-info" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:6px;">' +
                                    '<span class="saic-commenter-name" style="color: #5e5e5e !important; font-weight: 600; font-family:\'invitajafont\',sans-serif;">' + escapeHtml(item.author) + '</span>' +
                                    '<span class="saic-attendance-label" style="font-size: 11px; padding: 2px 8px; border-radius: 12px; font-family:\'invitajafont\',sans-serif; background: ' + badgeBg + '; color: ' + badgeColor + ';">' + attText + guestText + '</span>' +
                                '</div>' +
                                '<div class="saic-comment-text" style="color:#666; font-size:13px; font-family:\'invitajafont\',sans-serif; line-height:1.4; margin-bottom:4px;">' + escapeHtml(item.comment) + '</div>' +
                                '<div style="font-size:10px; color:#999; font-family:\'invitajafont\',sans-serif;">' + formattedDate + '</div>' +
                            '</div>' +
                        '</li>';
                    });
                    $container_comments.html(html);
                    jQuery("#saic-link-" + post_id + " span").html(data.length);
                } else {
                    $container_comments.html('<p style="text-align:center; color:#999; font-size:12px; font-family:\'invitajafont\',sans-serif;">Belum ada ucapan.</p>');
                    jQuery("#saic-link-" + post_id + " span").html(0);
                }
                $container_comments.show();
                jPages_SAIC(post_id, WDS_RSVP.jPagesNum);
            })
            .catch(function(err) {
                console.error("RSVP Fetch Error:", err);
                status.removeClass("saic-loading").html("").hide();
                $container_comments.html('<p style="text-align:center; color:#999; font-size:12px;">Gagal memuat ucapan.</p>').show();
            });
            
        return !1;
    }
    
    return num_comments > 0 && jQuery.ajax({
        type: "POST",
        dataType: "html",
        url: WDS_RSVP.ajaxurl,
        data: {
            action: "get_comments",
            post_id: post_id,
            get: num_get_comments,
            order: order_comments,
            nonce: WDS_RSVP.nonce
        },
        beforeSend: function() {
            status.addClass("saic-loading").html('<span class="saico-loading"></span>').show()
        },
        success: function(data) {
            status.removeClass("saic-loading").html("").hide(), $container_comments.html(data), $container_comments.show(), jPages_SAIC(post_id, WDS_RSVP.jPagesNum)
        },
        error: function(jqXHR, textStatus, errorThrown) {
            clog("ajax error"), clog("jqXHR"), clog(jqXHR), clog("errorThrown"), clog(errorThrown)
        },
        complete: function(jqXHR, textStatus) {}
    }), !1
}

function insertComment_SAIC(post_id, num_comments) {
    var link_show_comments = jQuery("#saic-link-" + post_id),
        comment_form = jQuery("#commentform-" + post_id),
        status = jQuery("#saic-comment-status-" + post_id),
        formSubmit = jQuery("#saic-wrap-form-" + post_id),
        form_data = new FormData(comment_form[0]),
        btnSubmit = jQuery(".saic-wrap-submit");
        
    if (WDS_RSVP.spreadsheet_url) {
        var formDataObj = {};
        form_data.forEach(function(value, key){
            formDataObj[key] = value;
        });
        
        btnSubmit.hide();
        status.addClass("saic-loading").html('<span class="saico-loading"></span>').show();
        
        // Use no-cors mode to completely bypass browser CORS checks on POST requests to Google Script
        fetch(WDS_RSVP.spreadsheet_url, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: jQuery.param(formDataObj)
        }).then(function() {
            status.removeClass("saic-loading").html("");
            status.html('<p class="saic-ajax-success">' + WDS_RSVP.thanksComment + "</p>");
            
            // Add newly created comment locally
            var attText = formDataObj.attendance === "present" ? "Hadir" : "Tidak Hadir";
            var guestText = (formDataObj.attendance === "present" && formDataObj.guest) ? " (" + formDataObj.guest + " Orang)" : "";
            var badgeBg = formDataObj.attendance === "present" ? "#d4edda" : "#f8d7da";
            var badgeColor = formDataObj.attendance === "present" ? "#155724" : "#721c24";
            var formattedDate = formatDateTime(new Date());
            
            var newComment = '<li class="saic-item-comment saic-clearfix" style="border-bottom:1px solid #eee; padding:12px 0; list-style:none;">' +
                '<div class="saic-comment-content" style="margin-left:0 !important;">' +
                    '<div class="saic-comment-info" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:6px;">' +
                        '<span class="saic-commenter-name" style="color: #5e5e5e !important; font-weight: 600; font-family:\'invitajafont\',sans-serif;">' + escapeHtml(formDataObj.author) + '</span>' +
                        '<span class="saic-attendance-label" style="font-size: 11px; padding: 2px 8px; border-radius: 12px; font-family:\'invitajafont\',sans-serif; background: ' + badgeBg + '; color: ' + badgeColor + ';">' + attText + guestText + '</span>' +
                    '</div>' +
                    '<div class="saic-comment-text" style="color:#666; font-size:13px; font-family:\'invitajafont\',sans-serif; line-height:1.4; margin-bottom:4px;">' + escapeHtml(formDataObj.comment) + '</div>' +
                    '<div style="font-size:10px; color:#999; font-family:\'invitajafont\',sans-serif;">' + formattedDate + '</div>' +
                '</div>' +
            '</li>';
            
            var container = jQuery("ul#saic-container-comment-" + post_id);
            container.find("p").remove();
            container.prepend(newComment).show();
            
            // Update counter
            var currentNum = parseInt(link_show_comments.find("span").html(), 10) || 0;
            link_show_comments.find("span").html(currentNum + 1);
            
            jPages_SAIC(post_id, WDS_RSVP.jPagesNum, !0);
            formSubmit.hide();
        }).catch(function() {
            status.removeClass("saic-loading").html('<p class="saic-ajax-error" >Gagal mengirim ucapan. Silakan coba lagi.</p>');
            btnSubmit.show();
        }).finally(function() {
            setTimeout(function() {
                status.fadeOut(600);
            }, 2500);
        });
        
        return !1;
    }
    
    return form_data.append("action", "insert_comment"), form_data.append("nonce", WDS_RSVP.nonce), jQuery.ajax({
        type: "POST",
        dataType: "html",
        url: WDS_RSVP.ajaxurl,
        data: form_data,
        processData: !1,
        contentType: !1,
        beforeSend: function() {
            btnSubmit.hide(), status.addClass("saic-loading").html('<span class="saico-loading"></span>').show()
        },
        success: function(data, textStatus) {
            if (status.removeClass("saic-loading").html(""), data.startsWith("error-")) {
                let errorMessage = data.substring(6);
                status.html('<p class="saic-ajax-error">' + errorMessage + "</p>"), btnSubmit.show()
            } else status.html('<p class="saic-ajax-success">' + WDS_RSVP.thanksComment + "</p>"), link_show_comments.find("span").length && (num_comments = String(parseInt(num_comments, 10) + 1), link_show_comments.find("span").html(num_comments)), jQuery("ul#saic-container-comment-" + post_id).prepend(data).show(), jPages_SAIC(post_id, WDS_RSVP.jPagesNum, !0), formSubmit.hide()
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            status.removeClass("saic-loading").html('<p class="saic-ajax-error" >' + WDS_RSVP.duplicateComment + "</p>")
        },
        complete: function(jqXHR, textStatus) {
            setTimeout((function() {
                status.removeClass("saic-loading").fadeOut(600)
            }), 2500)
        }
    }), !1
}

function jPages_SAIC(post_id, $numPerPage, $destroy) {
    if ("function" == typeof jQuery.fn.jPages) {
        var $idList = "saic-container-comment-" + post_id,
            $holder = "div.saic-holder-" + post_id,
            num_comments;
        jQuery("#" + $idList + " > li").length > $numPerPage && ($destroy && jQuery("#" + $idList).children().removeClass("animated jp-hidden"), jQuery($holder).show().jPages({
            containerID: $idList,
            previous: WDS_RSVP.textNavPrev,
            next: WDS_RSVP.textNavNext,
            perPage: parseInt($numPerPage, 10),
            minHeight: !1,
            keyBrowse: !0,
            direction: "forward",
            animation: "fadeIn"
        }))
    }
    return !1
}

function getUrlVars_SAIC(url) {
    for (var query, parts = url.substring(url.indexOf("?") + 1).split("&"), params = {}, i = 0; i < parts.length; i++) {
        var pair = parts[i].split("=");
        params[pair[0]] = pair[1]
    }
    return params
}

function rezizeBoxComments_SAIC(wrapper) {
    var widthWrapper;
    wrapper.outerWidth() <= 480 ? wrapper.addClass("saic-full") : wrapper.removeClass("saic-full")
}

function clog(msg) {
    console.log(msg)
}
jQuery(document).ready((function($) {
    $(".saic-wrap-comments").each((function(index, element) {
        var ids = $("[id='" + this.id + "']");
        ids.length > 1 && ids.slice(1).closest(".saic-wrapper").remove()
    })), $('.saic-container-form [name="comment_parent"], .saic-container-form [name="comment_post_ID"]').each((function(index, input) {
        $(input).removeAttr("id")
    })), "function" == typeof jQuery.fn.textareaCount && $(".saic-textarea").each((function() {
        var textCount = {
            maxCharacterSize: WDS_RSVP.textCounterNum,
            originalStyle: "saic-counter-info",
            warningStyle: "saic-counter-warn",
            warningNumber: 20,
            displayFormat: "#left"
        };
        $(this).textareaCount(textCount)
    })), "function" == typeof jQuery.fn.placeholder && $(".saic-wrap-form input, .saic-wrap-form textarea").placeholder(), "function" == typeof autosize && autosize($("textarea.saic-textarea")), $(".saic-wrapper").each((function() {
        rezizeBoxComments_SAIC($(this))
    })), $(window).resize((function() {
        $(".saic-wrapper").each((function() {
            rezizeBoxComments_SAIC($(this))
        }))
    })), $("body").on("click", "a.saic-link", (function(e) {
        e.preventDefault();
        var linkVars = getUrlVars_SAIC($(this).attr("href")),
            post_id = linkVars.post_id,
            num_comments = linkVars.comments,
            num_get_comments = linkVars.get,
            order_comments = linkVars.order;
        $("#saic-wrap-comment-" + post_id).slideToggle(200);
        var container_comment = $("#saic-container-comment-" + post_id);
        return container_comment.length && 0 === container_comment.html().length && getComments_SAIC(post_id, num_comments, num_get_comments, order_comments), !1
    })), $("a.saic-link").length && $("a.saic-link.auto-load-true").each((function() {
        $(this).click()
    })), $("input, select, textarea").focus((function() {
        $(this).removeClass("saic-error"), $(this).siblings(".saic-error-info").hide()
    })),
    // Start Edit Kode Tambahan Untuk Konfirmasi Kehadiran
        $(document).ready(function() {
            $('.saic-button').click(function() {
                var selectedValue = $(this).val();
                $('#attendance').val(selectedValue);

                if (selectedValue === 'present') {
                    // Tampilkan elemen tamu jika pilihan "present"
                    if (WDS_RSVP.guestMax == 1) {
                        $('#guest').val(1); // Jika guestMax = 1, atur nilai langsung ke 1
                    } else {
                        $('.saic-wrap-guest').show(); // Jika tidak, tampilkan elemen guest
                    }
                } else {
                    // Sembunyikan elemen tamu jika pilihan bukan "present"
                    $('.saic-wrap-guest').hide();
                }
            });

            document.querySelectorAll('.saic-button').forEach(button => {
                button.addEventListener('click', function() {
                    document.getElementById('attendance').value = this.value;
                    document.querySelectorAll('.saic-button').forEach(btn => btn.classList.remove('rvspSelect'));
                    this.classList.add('rvspSelect'); // Tambahkan kelas untuk tombol yang dipilih
                });
            });
        });
    // End Edit Kode Tambahan Untuk Konfirmasi Kehadiran
      $("body").on("submit", ".saic-container-form form", (function(e) {
        e.preventDefault(), $(this).find(":submit").attr("disabled", "disabled"), $("input, textarea").removeClass("saic-error");
        var formID, post_id = $(this).attr("id").replace("commentform-", ""),
            form = $("#commentform-" + post_id),
            link_show_comments, num_comments = $("#saic-link-" + post_id).attr("href").split("=")[2],
            form_ok = !0,
            $content;
        if (form.find("textarea").val().replace(/\s+/g, " ").length < 2) return form.find(".saic-textarea").addClass("saic-error"), form.find(".saic-error-info-text").show(), setTimeout((function() {
            form.find(".saic-error-info-text").fadeOut(500)
        }), 2500), $(this).find(":submit").removeAttr("disabled"), !1;
        if ($(this).find("input#author").length) {
            var $author = $(this).find("input#author"),
                $authorVal = $author.val().replace(/\s+/g, " "),
                $authorRegEx;
            " " != $authorVal && /^[^?%$=\/]{1,50}$/i.test($authorVal) || ($author.addClass("saic-error"), form.find(".saic-error-info-name").show(), setTimeout((function() {
                form.find(".saic-error-info-name").fadeOut(500)
            }), 3e3), form_ok = !1)
        }
        if ($(this).find("input#email").length) {
            var $emailRegEx = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,6}$/i,
                $email = $(this).find("input#email"),
                $emailVal = $email.val().replace(/\s+/g, "");
            $email.val($emailVal), $emailRegEx.test($emailVal) || ($email.addClass("saic-error"), form.find(".saic-error-info-email").show(), setTimeout((function() {
                form.find(".saic-error-info-email").fadeOut(500)
            }), 3e3), form_ok = !1)
        }
        if ($(this).find("select#attendance").length) {
            var $attendance = $(this).find("select#attendance"),
                $guest = $(this).find("select#guest");
            if ($attendance.length > 0) {
                var $attendanceVal = $attendance.val();
                if (null !== $attendanceVal && "" !== $attendanceVal.trim()) {
                    var $attendanceVals = $attendanceVal.replace(/\s+/g, " "),
                        $attendanceRegEx;
                    if (/^[^?&%$=\/]{1,30}$/i.test($attendanceVals) || ($attendance.addClass("saic-error"), form.find(".saic-error-info-attendance").show(), setTimeout((function() {
                            form.find(".saic-error-info-attendance").fadeOut(500)
                        }), 3e3), form_ok = !1), "present" == $attendanceVal) {
                        var $guestVal = $guest.val();
                        null != $guestVal && "" != $guestVal.trim() || ($guest.addClass("saic-error"), form.find(".saic-error-info-guest").show(), setTimeout((function() {
                            form.find(".saic-error-info-guest").fadeOut(500)
                        }), 3e3), form_ok = !1)
                    }
                } else $attendance.addClass("saic-error"), form.find(".saic-error-info-attendance").show(), setTimeout((function() {
                    form.find(".saic-error-info-attendance").fadeOut(500)
                }), 3e3), form_ok = !1
            }
        }
        return form_ok ? (!0 === form_ok && insertComment_SAIC(post_id, num_comments), $(this).find(":submit").removeAttr("disabled"), !1) : ($(this).find(":submit").removeAttr("disabled"), !1)
    }))
}));