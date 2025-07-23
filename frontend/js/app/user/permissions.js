const Mn        = require('backbone.marionette');
const App       = require('../main');
const UserModel = require('../../models/user');
const template  = require('./permissions.ejs');

require('jquery-serializejson');

module.exports = Mn.View.extend({
    template:  template,
    className: 'modal-dialog',

    ui: {
        form:    'form',
        buttons: '.modal-footer button',
        cancel:  'button.cancel',
        save:    'button.save',
        error:   '.secret-error',
        detect_global_ips_admin_btn: 'button.detect-global-ips-admin',
        allowed_listen_ips_select: 'select[name="allowed_listen_ips"]',
        available_ips_container_admin: '.available-ips-container-admin',
        available_ips_list_admin: '.available-ips-list-admin'
    },

    events: {
        'click @ui.detect_global_ips_admin_btn': function (e) {
            e.preventDefault();
            this.detectGlobalIPsForAdmin();
        },

        'click @ui.save': function (e) {
            e.preventDefault();

            let view = this;
            let data = this.ui.form.serializeJSON();

            // Handle allowed_listen_ips
            if (data.allowed_listen_ips && typeof data.allowed_listen_ips === 'string') {
                data.allowed_listen_ips = [data.allowed_listen_ips];
            } else if (!data.allowed_listen_ips) {
                data.allowed_listen_ips = null;
            }

            // Manipulate
            if (view.model.isAdmin()) {
                // Force some attributes for admin
                data = _.assign({}, data, {
                    access_lists:      'manage',
                    dead_hosts:        'manage',
                    proxy_hosts:       'manage',
                    redirection_hosts: 'manage',
                    streams:           'manage',
                    certificates:      'manage',
                    acme_servers:      'manage'
                });
            }

            this.ui.buttons.prop('disabled', true).addClass('btn-disabled');

            App.Api.Users.setPermissions(view.model.get('id'), data)
                .then(() => {
                    if (view.model.get('id') === App.Cache.User.get('id')) {
                        App.Cache.User.set({permissions: data});
                    }

                    view.model.set({permissions: data});
                    App.UI.closeModal();
                })
                .catch(err => {
                    this.ui.error.text(err.message).show();
                    this.ui.buttons.prop('disabled', false).removeClass('btn-disabled');
                });
        }
    },

    templateContext: function () {
        let perms    = this.model.get('permissions');
        let is_admin = this.model.isAdmin();

        return {
            getPerm: function (key) {
                if (perms !== null && typeof perms[key] !== 'undefined') {
                    return perms[key];
                }

                return null;
            },

            getPermProps: function (key, item, forced_admin) {
                if (forced_admin && is_admin) {
                    return 'checked disabled';
                } else if (is_admin) {
                    return 'disabled';
                } else if (perms !== null && typeof perms[key] !== 'undefined' && perms[key] === item) {
                    return 'checked';
                }

                return '';
            },

            isAdmin: function () {
                return is_admin;
            }
        };
    },

    initialize: function (options) {
        if (typeof options.model === 'undefined' || !options.model) {
            this.model = new UserModel.Model();
        }
    },

    onRender: function() {
        // Initialize allowed_listen_ips if editing existing user
        const perms = this.model.get('permissions');
        if (perms && perms.allowed_listen_ips) {
            const select = this.ui.allowed_listen_ips_select;
            perms.allowed_listen_ips.forEach(ip => {
                select.append(`<option value="${ip}" selected>${ip}</option>`);
            });
        }
    },

    detectGlobalIPsForAdmin: function() {
        const view = this;
        const btn = this.ui.detect_global_ips_admin_btn;
        
        // Show loading state
        btn.prop('disabled', true).html('<i class="fe fe-loader"></i> Detecting...');
        
        App.Api.Nginx.getGlobalIPs()
            .then(response => {
                if (response && response.global_ips && response.global_ips.length > 0) {
                    view.populateAllowedListenIPs(response.global_ips);
                    view.ui.available_ips_container_admin.show();
                } else {
                    App.UI.showAlert('No global IPs detected', 'warning');
                }
            })
            .catch(err => {
                console.error(err);
                App.UI.showAlert('Failed to detect global IPs: ' + (err.message || err), 'danger');
            })
            .finally(() => {
                btn.prop('disabled', false).html('<i class="fe fe-search"></i> Detect Global IPs');
            });
    },

    populateAllowedListenIPs: function(globalIPs) {
        const select = this.ui.allowed_listen_ips_select;
        const listContainer = this.ui.available_ips_list_admin;
        
        // Clear existing list display (but keep selected options)
        listContainer.empty();
        
        // Add available IPs to select (if not already present) and display list
        globalIPs.forEach(ip => {
            const ipStr = typeof ip === 'object' ? ip.address : ip;
            if (!select.find(`option[value="${ipStr}"]`).length) {
                select.append(`<option value="${ipStr}">${ipStr}</option>`);
            }
            listContainer.append(`<span class="badge badge-secondary mr-1 mb-1">${ipStr}</span>`);
        });
    }
});
